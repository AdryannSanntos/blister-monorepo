import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import type { EmailPort, SendEmailOptions, SendEmailResult } from './email.port';

@Injectable()
export class ResendEmailAdapter implements EmailPort {
  private readonly client: Resend;
  private readonly from: string;
  private readonly logger = new Logger(ResendEmailAdapter.name);

  constructor(@Inject(ConfigService) private readonly config: ConfigService) {
    this.client = new Resend(this.config.get<string>('RESEND_API_KEY'));
    this.from = this.config.get<string>('RESEND_FROM_EMAIL', 'noreply@example.com');
  }

  async send(options: SendEmailOptions): Promise<SendEmailResult> {
    const from = options.from ?? this.from;

    const { data, error } = await this.client.emails.send({
      from,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.html,
    });

    if (error) {
      this.logger.error(`Failed to send email to ${String(options.to)}: ${error.message}`);
      throw new Error(`Email delivery failed: ${error.message}`);
    }

    return { id: data?.id ?? 'unknown' };
  }
}
