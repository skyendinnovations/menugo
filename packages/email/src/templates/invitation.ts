export interface InvitationEmailData {
  restaurantName: string;
  inviterName: string;
  inviterEmail: string;
  expiresAt: Date;
  actionUrl: string;
  isExistingUser: boolean;
}

export function renderInvitationEmail(data: InvitationEmailData) {
  const {
    restaurantName,
    inviterName,
    inviterEmail,
    expiresAt,
    actionUrl,
    isExistingUser,
  } = data;

  const ctaText = isExistingUser ? "Sign In & Accept" : "Sign Up & Accept";
  const expiresFormatted = expiresAt.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const subject = `You've been invited to join ${restaurantName} on MenuGo`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#0F172A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0F172A;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <span style="font-size:28px;font-weight:700;color:#F97316;letter-spacing:-0.5px;">MenuGo</span>
            </td>
          </tr>
          <!-- Card -->
          <tr>
            <td style="background-color:#1E293B;border-radius:12px;padding:40px 32px;">
              <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#FFFFFF;">You're invited!</h1>
              <p style="margin:0 0 24px;font-size:15px;color:#94A3B8;line-height:1.6;">
                <strong style="color:#F1F5F9;">${inviterName}</strong> (${inviterEmail}) has invited you to join
                <strong style="color:#F97316;">${restaurantName}</strong> on MenuGo.
              </p>
              <!-- CTA -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 24px;">
                    <a href="${actionUrl}" target="_blank"
                       style="display:inline-block;background-color:#F97316;color:#FFFFFF;font-size:16px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:8px;">
                      ${ctaText}
                    </a>
                  </td>
                </tr>
              </table>
              <!-- Expiry -->
              <p style="margin:0;font-size:13px;color:#64748B;text-align:center;">
                This invitation expires on <strong style="color:#94A3B8;">${expiresFormatted}</strong>.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:12px;color:#475569;">
                If you didn't expect this invitation, you can safely ignore this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    `You've been invited to join ${restaurantName} on MenuGo!`,
    "",
    `${inviterName} (${inviterEmail}) has invited you to join ${restaurantName}.`,
    "",
    `${ctaText}: ${actionUrl}`,
    "",
    `This invitation expires on ${expiresFormatted}.`,
    "",
    "If you didn't expect this invitation, you can safely ignore this email.",
  ].join("\n");

  return { subject, html, text };
}
