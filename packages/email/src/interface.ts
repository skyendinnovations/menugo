export interface SendEmailOptions {
  to: string | { email: string; name?: string };
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

export interface SendEmailResult {
  messageId: string;
}

export interface IEmailProvider {
  sendEmail(options: SendEmailOptions): Promise<SendEmailResult>;
}
