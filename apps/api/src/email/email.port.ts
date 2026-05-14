export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

export interface SendEmailResult {
  id: string;
}

export const EMAIL_PORT = Symbol('EMAIL_PORT');

export interface EmailPort {
  send(options: SendEmailOptions): Promise<SendEmailResult>;
}
