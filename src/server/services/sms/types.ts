export interface SendPatternRequest {
  recipient: string; // Iranian mobile (09xx...)
  patternCode: string;
  values: Record<string, string>;
  originator?: string;
}

export interface SendDirectRequest {
  recipients: string[]; // Iranian mobile list
  messageText: string;
  originator?: string;
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  provider: string;
  segments?: number;
  status: 'sent' | 'queued' | 'failed';
  error?: string;
}

export interface SmsProvider {
  readonly name: string;
  sendPattern(req: SendPatternRequest): Promise<SendResult>;
  sendDirect(req: SendDirectRequest): Promise<SendResult>;
  checkStatus?(messageId: string): Promise<string>;
}

export interface QueueItem {
  id: string;
  provider: string;
  message_type: 'pattern' | 'direct';
  recipient_phone: string;
  pattern_code?: string;
  pattern_values_json?: string;
  message_text?: string;
  originator?: string;
  segments: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  attempts: number;
  max_attempts: number;
  next_attempt_at: string;
  last_error?: string;
  sms_log_id?: string;
  created_at: string;
  updated_at: string;
}

export interface SmsSegmentCalculation {
  isPersian: boolean;
  characterCount: number;
  segments: number;
  maxCharsPerSegment: number;
  charsLeftInSegment: number;
}
