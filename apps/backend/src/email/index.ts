import { createSmtpEmailProvider, type IEmailProvider } from "@menugo/email";
import { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } from "../envs";

let emailProvider: IEmailProvider | null = null;

export function getEmailProvider(): IEmailProvider | null {
  if (!SMTP_HOST) return null;
  if (!emailProvider) {
    emailProvider = createSmtpEmailProvider({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      user: SMTP_USER ?? "",
      pass: SMTP_PASS ?? "",
      from: SMTP_FROM ?? "noreply@menugo.com",
    });
  }
  return emailProvider;
}

export type { IEmailProvider, SendEmailOptions, SendEmailResult } from "@menugo/email";
