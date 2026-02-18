import { createServerAuth } from "@menugo/auth/server";
import { db } from "@menugo/data";
import { user, session, account, verification } from "@menugo/data/schemas";
import {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASS,
    SMTP_FROM,
    TRUSTED_ORIGINS,
    OAUTH_CLIENT_ID,
    OAUTH_CLIENT_SECRET,
} from "./src/envs";

export const auth = createServerAuth({
    db,
    schema: { user, session, account, verification },
    trustedOrigins: TRUSTED_ORIGINS ? TRUSTED_ORIGINS.split(",") : [],
    smtp: SMTP_HOST
        ? {
              host: SMTP_HOST,
              port: parseInt(SMTP_PORT),
              user: SMTP_USER!,
              pass: SMTP_PASS!,
              from: SMTP_FROM,
          }
        : undefined,
    google:
        OAUTH_CLIENT_ID && OAUTH_CLIENT_SECRET
            ? { clientId: OAUTH_CLIENT_ID, clientSecret: OAUTH_CLIENT_SECRET }
            : undefined,
});
