import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as formData from 'form-data';
import Mailgun from 'mailgun.js';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly mg: Mailgun;
  private readonly domain: string;
  private readonly fromEmail: string;
  private readonly fromName: string;

  constructor(private readonly config: ConfigService) {
    this.mg = new Mailgun(formData);
    this.domain = this.config.get<string>('MAILGUN_DOMAIN', '');
    this.fromEmail = this.config.get<string>('FROM_EMAIL', 'noreply@carwash.com');
    this.fromName = this.config.get<string>('FROM_NAME', 'CarWash');

    (this.mg as any).client({
      username: 'api',
      key: this.config.get<string>('MAILGUN_API_KEY', ''),
    });
  }

  async send(data: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<void> {
    try {
      const result = await (this.mg as any).messages.create(this.domain, {
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
