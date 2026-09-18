import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly apiKey: string;
  private readonly senderId: string;
  private readonly baseUrl = 'https://api.mnotify.com';

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('MNOTIFY_API_KEY', '');
    this.senderId = this.config.get<string>('MNOTIFY_SENDER_ID', 'CarWash');
  }

  get isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  async send(data: { to: string; message: string }): Promise<{ success: boolean; messageId?: string }> {
    if (!this.isConfigured) {
      this.logger.warn('MNotify API key not configured — SMS not sent');
      return { success: false };
    }

    const payload = {
      recipient: data.to,
      sender: this.senderId,
      message: data.message,
      type: 0, // plain text
    };

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/sms/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json() as {
        code?: string;
        message?: string;
        data?: { msg_id?: string };
      };

      if (response.ok && result.code === '2000') {
        this.logger.log(`SMS sent to ${data.to}: ${result.data?.msg_id}`);
        return { success: true, messageId: result.data?.msg_id };
      }

      this.logger.error(`SMS failed to ${data.to}: ${result.message || response.statusText}`);
      return { success: false };
    } catch (error: any) {
      this.logger.error(`SMS send error to ${data.to}: ${error?.message || error}`);
      return { success: false };
    }
  }
}
