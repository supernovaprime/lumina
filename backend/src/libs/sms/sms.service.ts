import { Injectable } from '@nestjs/common';

@Injectable()
export class SmsService {
  async send(data: {
    to: string;
    message: string;
  }): Promise<void> {
    // TODO: Integrate with MNotify API
    console.log(`📱 SMS sent to ${data.to}: ${data.message}`);
  }
}
