import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as FormData from 'form-data';
import Mailgun from 'mailgun.js';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly client: any | null;
  private readonly domain: string;
  private readonly fromEmail: string;
  private readonly fromName: string;

  constructor(private readonly config: ConfigService) {
    this.domain = this.config.get<string>('MAILGUN_DOMAIN', '');
    this.fromEmail = this.config.get<string>('FROM_EMAIL', 'noreply@carwash.com');
    this.fromName = this.config.get<string>('FROM_NAME', 'CarWash');

    const apiKey = this.config.get<string>('MAILGUN_API_KEY');
    if (apiKey) {
      try {
        const mg = new Mailgun(FormData as any);
        this.client = mg.client({ username: 'api', key: apiKey });
      } catch (error: any) {
        this.logger.warn(`Failed to initialize Mailgun client: ${error?.message}`);
        this.client = null;
      }
    } else {
      this.logger.warn('MAILGUN_API_KEY not set — emails will not be sent');
      this.client = null;
    }
  }

  async send(data: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<void> {
    if (!this.client) {
      this.logger.warn(`Email not sent (Mailgun not configured): ${data.subject}`);
      return;
    }

    try {
      const result = await this.client.messages.create(this.domain, {
        from: `${this.fromName} <${this.fromEmail}>`,
        to: [data.to],
        subject: data.subject,
        'h:Reply-To': this.fromEmail,
        html: data.html,
        text: data.text,
      });

      this.logger.log(`Email sent to ${data.to}: ${result.id}`);
    } catch (error: any) {
      this.logger.error(`Failed to send email to ${data.to}: ${error?.message || error}`);
    }
  }

  async sendWithHtml(to: string, subject: string, html: string): Promise<void> {
    return this.send({ to, subject, html });
  }
}
