export { SmtpEmailProvider } from "./smtp";
export type { SmtpConfig } from "./smtp";
export type {
  IEmailProvider,
  SendEmailOptions,
  SendEmailResult,
} from "./interface";
export {
  renderInvitationEmail,
  type InvitationEmailData,
} from "./templates/invitation";

import type { SmtpConfig } from "./smtp";
import { SmtpEmailProvider } from "./smtp";
import type { IEmailProvider } from "./interface";

export function createSmtpEmailProvider(config: SmtpConfig): IEmailProvider {
  return new SmtpEmailProvider(config);
}
