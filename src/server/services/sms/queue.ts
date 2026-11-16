import { getDb } from '../../db';
import { normalizeIranianPhone } from '../../../client/lib/phone';
import { SendPatternRequest, SendDirectRequest, QueueItem } from './types';
import { countSmsSegments } from './segments';
import { SmsProviderRegistry } from './registry';

export class SmsQueueEngine {
  private db: any;
  private registry: SmsProviderRegistry;

  constructor(db?: any, registry?: SmsProviderRegistry) {
    this.db = db || getDb();
    this.registry = registry || SmsProviderRegistry.getInstance();
  }

  enqueuePattern(req: SendPatternRequest, options: { maxAttempts?: number; provider?: string } = {}) {
    const normalizedPhone = normalizeIranianPhone(req.recipient);
    if (!normalizedPhone) {
      throw new Error(`Invalid Iranian phone number: ${req.recipient}`);
    }

    const providerName = options.provider || this.registry.getDefaultName();
    const queueId = 'sq_' + Math.random().toString(36).substring(2, 10);
    const maxAttempts = options.maxAttempts || 3;

    this.db.prepare(`
      INSERT INTO sms_queue (
        id, provider, message_type, recipient_phone, pattern_code, pattern_values_json,
        originator, segments, status, attempts, max_attempts, next_attempt_at
      ) VALUES (?, ?, 'pattern', ?, ?, ?, ?, 1, 'pending', 0, ?, datetime('now'))
    `).run(
      queueId,
      providerName,
      normalizedPhone,
      req.patternCode,
      JSON.stringify(req.values),
      req.originator || null,
      maxAttempts
    );

    return {
      queueId,
      recipient: normalizedPhone,
      provider: providerName,
      status: 'pending'
    };
  }

  enqueueDirect(req: SendDirectRequest, options: { maxAttempts?: number; provider?: string } = {}) {
    if (!req.recipients || req.recipients.length === 0) {
      throw new Error('At least one recipient is required');
    }
    if (!req.messageText) {
      throw new Error('Message text is required');
    }

    const providerName = options.provider || this.registry.getDefaultName();
    const maxAttempts = options.maxAttempts || 3;
    const segmentInfo = countSmsSegments(req.messageText);
    const queueIds: string[] = [];

    const insertMany = this.db.transaction(() => {
      for (const phone of req.recipients) {
        const normalized = normalizeIranianPhone(phone);
        if (!normalized) continue;

        const queueId = 'sq_' + Math.random().toString(36).substring(2, 10);
        this.db.prepare(`
          INSERT INTO sms_queue (
            id, provider, message_type, recipient_phone, message_text,
            originator, segments, status, attempts, max_attempts, next_attempt_at
          ) VALUES (?, ?, 'direct', ?, ?, ?, ?, 'pending', 0, ?, datetime('now'))
        `).run(
          queueId,
          providerName,
          normalized,
          req.messageText,
          req.originator || null,
          segmentInfo.segments,
          maxAttempts
        );
        queueIds.push(queueId);
      }
    });

    insertMany();

    return {
      enqueuedCount: queueIds.length,
      segmentsPerMessage: segmentInfo.segments,
      isPersian: segmentInfo.isPersian,
      queueIds
    };
  }

  async processBatch(batchSize: number = 10, backoffBaseSeconds: number = 30) {
    const items: QueueItem[] = this.db.prepare(`
      SELECT * FROM sms_queue
      WHERE status = 'pending'
        AND datetime('now') >= datetime(next_attempt_at)
      ORDER BY created_at ASC
      LIMIT ?
    `).all(batchSize);

    if (items.length === 0) {
      return { processedCount: 0, succeeded: 0, failed: 0, items: [] };
    }

    const results: any[] = [];
    let succeeded = 0;
    let failed = 0;

    for (const item of items) {
      // Mark as processing
      this.db.prepare(`
        UPDATE sms_queue
        SET status = 'processing', updated_at = datetime('now')
        WHERE id = ?
      `).run(item.id);

      try {
        const provider = this.registry.get(item.provider);
        let sendRes: any;

        if (item.message_type === 'pattern') {
          const values = item.pattern_values_json ? JSON.parse(item.pattern_values_json) : {};
          sendRes = await provider.sendPattern({
            recipient: item.recipient_phone,
            patternCode: item.pattern_code!,
            values,
            originator: item.originator
          });
        } else {
          sendRes = await provider.sendDirect({
            recipients: [item.recipient_phone],
            messageText: item.message_text!,
            originator: item.originator
          });
        }

        if (sendRes.success) {
          // Completed
          const logId = 'sms_' + Math.random().toString(36).substring(2, 10);
          this.db.transaction(() => {
            this.db.prepare(`
              UPDATE sms_queue
              SET status = 'completed', attempts = attempts + 1, sms_log_id = ?, updated_at = datetime('now')
              WHERE id = ?
            `).run(logId, item.id);

            this.db.prepare(`
              INSERT INTO sms_logs (
                id, recipient_phone, message_type, pattern_code, pattern_values_json,
                message_text, originator, provider, status, provider_message_id, segments, sent_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'sent', ?, ?, datetime('now'))
            `).run(
              logId,
              item.recipient_phone,
              item.message_type,
              item.pattern_code || null,
              item.pattern_values_json || null,
              item.message_text || null,
              item.originator || null,
              item.provider,
              sendRes.messageId || null,
              item.segments || 1
            );
          })();

          succeeded++;
          results.push({ id: item.id, status: 'completed', messageId: sendRes.messageId });
        } else {
          throw new Error(sendRes.error || 'Provider rejected SMS delivery');
        }
      } catch (err: any) {
        failed++;
        const nextAttemptCount = item.attempts + 1;
        const isPermanentlyFailed = nextAttemptCount >= item.max_attempts;

        if (isPermanentlyFailed) {
          const logId = 'sms_' + Math.random().toString(36).substring(2, 10);
          this.db.transaction(() => {
            this.db.prepare(`
              UPDATE sms_queue
              SET status = 'failed', attempts = ?, last_error = ?, sms_log_id = ?, updated_at = datetime('now')
              WHERE id = ?
            `).run(nextAttemptCount, err.message, logId, item.id);

            this.db.prepare(`
              INSERT INTO sms_logs (
                id, recipient_phone, message_type, pattern_code, pattern_values_json,
                message_text, originator, provider, status, error_message, segments
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'failed', ?, ?)
            `).run(
              logId,
              item.recipient_phone,
              item.message_type,
              item.pattern_code || null,
              item.pattern_values_json || null,
              item.message_text || null,
              item.originator || null,
              item.provider,
              err.message,
              item.segments || 1
            );
          })();
          results.push({ id: item.id, status: 'failed', error: err.message });
        } else {
          // Exponential backoff: base * 2^(attempt - 1)
          const delaySeconds = Math.max(5, Math.pow(2, nextAttemptCount) * backoffBaseSeconds);
          this.db.prepare(`
            UPDATE sms_queue
            SET status = 'pending', attempts = ?, last_error = ?,
                next_attempt_at = datetime('now', '+' || ? || ' seconds'),
                updated_at = datetime('now')
            WHERE id = ?
          `).run(nextAttemptCount, err.message, delaySeconds, item.id);

          results.push({ id: item.id, status: 'retrying', attempt: nextAttemptCount, nextDelay: delaySeconds, error: err.message });
        }
      }
    }

    return {
      processedCount: items.length,
      succeeded,
      failed,
      items: results
    };
  }

  getQueueStats() {
    const rows = this.db.prepare(`
      SELECT status, COUNT(*) as count
      FROM sms_queue
      GROUP BY status
    `).all();

    const stats: Record<string, number> = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
      total: 0
    };

    for (const r of rows) {
      stats[r.status] = r.count;
      stats.total += r.count;
    }

    return stats;
  }

  listQueue(filters: { status?: string; recipient?: string; limit?: number } = {}) {
    let sql = 'SELECT * FROM sms_queue WHERE 1=1';
    const params: any[] = [];

    if (filters.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
    }
    if (filters.recipient) {
      const normalized = normalizeIranianPhone(filters.recipient);
      sql += ' AND recipient_phone LIKE ?';
      params.push(`%${normalized || filters.recipient}%`);
    }

    sql += ' ORDER BY created_at DESC';
    if (filters.limit) {
      sql += ' LIMIT ?';
      params.push(filters.limit);
    } else {
      sql += ' LIMIT 50';
    }

    return this.db.prepare(sql).all(...params);
  }

  retryItem(queueId: string) {
    const item = this.db.prepare('SELECT * FROM sms_queue WHERE id = ?').get(queueId);
    if (!item) {
      throw new Error(`Queue item ${queueId} not found`);
    }

    this.db.prepare(`
      UPDATE sms_queue
      SET status = 'pending', attempts = 0, next_attempt_at = datetime('now'), updated_at = datetime('now')
      WHERE id = ?
    `).run(queueId);

    return { success: true, id: queueId, status: 'pending' };
  }

  cancelItem(queueId: string) {
    const item = this.db.prepare('SELECT * FROM sms_queue WHERE id = ?').get(queueId);
    if (!item) {
      throw new Error(`Queue item ${queueId} not found`);
    }

    this.db.prepare(`
      UPDATE sms_queue
      SET status = 'cancelled', updated_at = datetime('now')
      WHERE id = ?
    `).run(queueId);

    return { success: true, id: queueId, status: 'cancelled' };
  }
}
