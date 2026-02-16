import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import type {
  IEmailProvider,
  SendEmailOptions,
  SendEmailResult,
} from "./interface";

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  secure?: boolean;
}

export class SmtpEmailProvider implements IEmailProvider {
  private transporter: Transporter;
  private defaultFrom: string;

  constructor(config: SmtpConfig) {
    this.defaultFrom = config.from;
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure ?? config.port === 465,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });
  }

  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    const to =
      typeof options.to === "string"
        ? options.to
        : options.to.name
          ? `"${options.to.name}" <${options.to.email}>`
          : options.to.email;

    const info = await this.transporter.sendMail({
      from: options.from ?? this.defaultFrom,
      to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo,
    });

    return { messageId: info.messageId };
  }
}
