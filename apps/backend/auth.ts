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

const developmentTrustedOrigins = [
    "http://localhost:3000",
    "http://localhost:8081",
    "http://localhost:8082",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:8081",
    "http://127.0.0.1:8082",
];

const trustedOrigins = Array.from(
    new Set([
        ...(TRUSTED_ORIGINS ? TRUSTED_ORIGINS.split(",") : []),
        ...developmentTrustedOrigins,
    ])
);

export const auth = createServerAuth({
    db,
    schema: { user, session, account, verification },
    trustedOrigins,
    smtp: SMTP_HOST
        ? {
              host: SMTP_HOST,
              port: +SMTP_PORT,
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
