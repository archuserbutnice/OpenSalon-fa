import { getDb } from '../db';
import { normalizeIranianPhone } from '../../client/lib/phone';
import { SmsProvider, SendPatternRequest, SendDirectRequest, SendResult } from './sms/types';
import { SmsProviderRegistry } from './sms/registry';
import { countSmsSegments } from './sms/segments';

export const MEDIANA_ENDPOINTS = {
  BASE_URL: 'https://api.mediana.ir',
  SEND_PATTERN: 'https://api.mediana.ir/sms/v1/send/pattern',
  SEND_SMS: 'https://api.mediana.ir/sms/v1/send/sms'
};

export interface SendPatternParams {
  recipient: string;
  patternCode: string;
  values: Record<string, string>;
  originator?: string;
}

export interface SendDirectParams {
  recipients: string[];
  messageText: string;
  type?: 'Informational' | 'PromotionalToCustomers' | 'PromotionalAll';
  dateTime?: string; // ISO format
}

export class MedianaService implements SmsProvider {
  readonly name = 'mediana';
  private db: any;

  constructor(db?: any) {
    this.db = db || getDb();
    SmsProviderRegistry.getInstance().register(this);
  }

  getConfig() {
    const row = this.db.prepare('SELECT * FROM sms_configs WHERE provider = ? AND is_active = 1 LIMIT 1').get('mediana');
    if (!row) {
      return {
        id: 'cfg_mediana_default',
        provider: 'mediana',
        api_key: '',
        default_originator: '+9810001',
        is_active: 1,
        is_sandbox: 1
      };
    }
    return row;
  }

  updateConfig(data: { apiKey?: string; defaultOriginator?: string; isActive?: boolean; isSandbox?: boolean }) {
    const config = this.getConfig();
    const apiKey = data.apiKey !== undefined ? data.apiKey : config.api_key;
    const originator = data.defaultOriginator !== undefined ? data.defaultOriginator : config.default_originator;
    const isActive = data.isActive !== undefined ? (data.isActive ? 1 : 0) : config.is_active;
    const isSandbox = data.isSandbox !== undefined ? (data.isSandbox ? 1 : 0) : config.is_sandbox;

    this.db.prepare(`
      INSERT INTO sms_configs (id, provider, api_key, default_originator, is_active, is_sandbox, updated_at)
      VALUES (?, 'mediana', ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(id) DO UPDATE SET
        api_key = excluded.api_key,
        default_originator = excluded.default_originator,
        is_active = excluded.is_active,
        is_sandbox = excluded.is_sandbox,
        updated_at = datetime('now')
    `).run(config.id, apiKey, originator, isActive, isSandbox);

    return this.getConfig();
  }

  getTemplateByCode(patternCode: string) {
    return this.db.prepare('SELECT * FROM sms_templates WHERE pattern_code = ? AND is_active = 1').get(patternCode);
  }

  renderTemplate(patternCode: string, values: Record<string, string>): string {
    const tpl = this.getTemplateByCode(patternCode);
    if (!tpl || !tpl.sample_text) {
      return JSON.stringify(values);
    }

    let rendered = tpl.sample_text;
    for (const [key, val] of Object.entries(values)) {
      rendered = rendered.replace(new RegExp(`%${key}%`, 'g'), val);
      rendered = rendered.replace(new RegExp(`{${key}}`, 'g'), val);
    }
    return rendered;
  }

  async sendPattern(params: SendPatternParams): Promise<SendResult & { logId?: string; isSandbox?: boolean; recipient?: string; patternCode?: string }> {
    const normalizedPhone = normalizeIranianPhone(params.recipient);
    if (!normalizedPhone) {
      throw new Error(`Invalid Iranian mobile number: ${params.recipient}`);
    }

    // Validate required template variables if template exists
    const tpl = this.getTemplateByCode(params.patternCode);
    if (tpl && tpl.required_variables) {
      try {
        const requiredVars: string[] = JSON.parse(tpl.required_variables);
        for (const reqVar of requiredVars) {
          if (params.values[reqVar] === undefined || params.values[reqVar] === null || params.values[reqVar] === '') {
            throw new Error(`Missing required template variable '${reqVar}' for pattern '${params.patternCode}'`);
          }
        }
      } catch (e: any) {
        if (e.message.startsWith('Missing required template variable')) {
          throw e;
        }
      }
    }

    const config = this.getConfig();
    const originator = params.originator || config.default_originator;
    const logId = 'sms_' + Math.random().toString(36).substring(2, 10);
    const renderedSample = this.renderTemplate(params.patternCode, params.values);
    const segments = countSmsSegments(renderedSample).segments;

    // Initial log entry: queued
    this.db.prepare(`
      INSERT INTO sms_logs (
        id, recipient_phone, message_type, pattern_code, pattern_values_json,
        message_text, originator, provider, status, segments
      ) VALUES (?, ?, 'pattern', ?, ?, ?, ?, 'mediana', 'queued', ?)
    `).run(
      logId,
      normalizedPhone,
      params.patternCode,
      JSON.stringify(params.values),
      renderedSample,
      originator,
      segments
    );

    // Sandbox / Mock Mode
    if (config.is_sandbox === 1 || !config.api_key || config.api_key === 'mediana_test_api_key_sandbox') {
      const mockMsgId = 'med_mock_' + Math.random().toString(36).substring(2, 12);
      this.db.prepare(`
        UPDATE sms_logs
        SET status = 'sent', provider_message_id = ?, sent_at = datetime('now')
        WHERE id = ?
      `).run(mockMsgId, logId);

      return {
        success: true,
        provider: 'mediana',
        messageId: mockMsgId,
        logId,
        status: 'sent',
        segments,
        recipient: normalizedPhone,
        patternCode: params.patternCode,
        isSandbox: true
      };
    }

    // Live Mediana API Call
    try {
      const response = await fetch(MEDIANA_ENDPOINTS.SEND_PATTERN, {
        method: 'POST',
        headers: {
          'X-API-KEY': config.api_key,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          patternCode: params.patternCode,
          originator,
          recipient: normalizedPhone,
          values: params.values
        })
      });

      const resData = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errMsg = resData.message || `HTTP ${response.status} from Mediana API`;
        this.db.prepare(`
          UPDATE sms_logs
          SET status = 'failed', error_message = ?
          WHERE id = ?
        `).run(errMsg, logId);
        throw new Error(`Mediana API error: ${errMsg}`);
      }

      const providerId = resData.data?.messageId || resData.messageId || 'med_' + Date.now();
      this.db.prepare(`
        UPDATE sms_logs
        SET status = 'sent', provider_message_id = ?, sent_at = datetime('now')
        WHERE id = ?
      `).run(providerId, logId);

      return {
        success: true,
        provider: 'mediana',
        messageId: providerId,
        logId,
        status: 'sent',
        segments,
        recipient: normalizedPhone,
        patternCode: params.patternCode,
        isSandbox: false
      };
    } catch (err: any) {
      this.db.prepare(`
        UPDATE sms_logs
        SET status = 'failed', error_message = ?
        WHERE id = ?
      `).run(err.message, logId);
      throw err;
    }
  }

  async sendDirect(params: SendDirectParams): Promise<SendResult & { count?: number; recipients?: any[] }> {
    if (!params.recipients || params.recipients.length === 0) {
      throw new Error('At least one recipient phone number is required');
    }

    const normalizedRecipients: string[] = [];
    for (const r of params.recipients) {
      const n = normalizeIranianPhone(r);
      if (!n) {
        throw new Error(`Invalid Iranian mobile number in recipient list: ${r}`);
      }
      normalizedRecipients.push(n);
    }

    const config = this.getConfig();
    const type = params.type || 'Informational';
    const segments = countSmsSegments(params.messageText).segments;
    const results = [];

    for (const phone of normalizedRecipients) {
      const logId = 'sms_' + Math.random().toString(36).substring(2, 10);
      this.db.prepare(`
        INSERT INTO sms_logs (
          id, recipient_phone, message_type, message_text,
          originator, provider, status, segments
        ) VALUES (?, ?, 'direct', ?, ?, 'mediana', 'queued', ?)
      `).run(
        logId,
        phone,
        params.messageText,
        config.default_originator,
        segments
      );

      if (config.is_sandbox === 1 || !config.api_key || config.api_key === 'mediana_test_api_key_sandbox') {
        const mockMsgId = 'med_mock_' + Math.random().toString(36).substring(2, 12);
        this.db.prepare(`
          UPDATE sms_logs
          SET status = 'sent', provider_message_id = ?, sent_at = datetime('now')
          WHERE id = ?
        `).run(mockMsgId, logId);

        results.push({ phone, logId, status: 'sent', providerMessageId: mockMsgId, isSandbox: true });
      } else {
        // Will be batched in live call
        results.push({ phone, logId, status: 'queued' });
      }
    }

    // In live mode, call standard send endpoint
    if (config.is_sandbox !== 1 && config.api_key && config.api_key !== 'mediana_test_api_key_sandbox') {
      try {
        const response = await fetch(MEDIANA_ENDPOINTS.SEND_SMS, {
          method: 'POST',
          headers: {
            'X-API-KEY': config.api_key,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            type,
            recipients: normalizedRecipients,
            messageText: params.messageText,
            dateTime: params.dateTime || undefined
          })
        });

        const resData = await response.json().catch(() => ({}));
        if (!response.ok) {
          const errMsg = resData.message || `HTTP ${response.status} from Mediana API`;
          for (const r of results) {
            this.db.prepare(`UPDATE sms_logs SET status = 'failed', error_message = ? WHERE id = ?`).run(errMsg, r.logId);
            r.status = 'failed';
          }
          throw new Error(`Mediana API error: ${errMsg}`);
        }

        for (const r of results) {
          this.db.prepare(`
            UPDATE sms_logs SET status = 'sent', provider_message_id = ?, sent_at = datetime('now') WHERE id = ?
          `).run(resData.data?.messageId || 'med_' + Date.now(), r.logId);
          r.status = 'sent';
        }
      } catch (err: any) {
        throw err;
      }
    }

    return {
      success: true,
      provider: 'mediana',
      status: 'sent',
      segments,
      count: results.length,
      messageId: results[0]?.providerMessageId || 'med_direct_' + Date.now(),
      recipients: results
    };
  }

  getLogs(filters: { phone?: string; status?: string; limit?: number } = {}) {
    let sql = 'SELECT * FROM sms_logs WHERE 1=1';
    const params: any[] = [];
    if (filters.phone) {
      const norm = normalizeIranianPhone(filters.phone);
      sql += ' AND recipient_phone LIKE ?';
      params.push(`%${norm || filters.phone}%`);
    }
    if (filters.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
    }
    sql += ' ORDER BY created_at DESC';
    if (filters.limit) {
      sql += ' LIMIT ?';
      params.push(filters.limit);
    }
    return this.db.prepare(sql).all(...params);
  }

  getTemplates() {
    return this.db.prepare('SELECT * FROM sms_templates WHERE is_active = 1 ORDER BY name ASC').all();
  }
}
