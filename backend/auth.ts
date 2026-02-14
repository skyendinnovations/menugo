import { betterAuth } from "better-auth";
import { expo } from "@better-auth/expo";
import { admin, bearer, magicLink } from "better-auth/plugins";
import { db } from "./src/db";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { user, session, account, verification } from "./src/db/schemas/auth.schema";
import {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASS,
    SMTP_FROM,
    TRUSTED_ORIGINS,
} from "./src/envs";

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "pg",
        schema: {
            user,
            session,
            account,
            verification,
        },
    }),
    user: {
        additionalFields: {
            role: {
                type: "string",
                required: false,
                defaultValue: "user",
                input: false,
            },
            banned: {
                type: "boolean",
                defaultValue: false,
            }
        },
        modelName: "user",
        changeEmail: {
            enabled: true,
        }
    },
    advanced: {
        disableCSRFCheck: true,
        useSecureCookies: false,
    },
    emailAndPassword: {
        enabled: true,
    },
    emailVerification: SMTP_HOST ? {
        sendOnSignUp: true,
        autoSignInAfterVerification: true,
    } : undefined,
    magicLink: SMTP_HOST ? {
        enabled: true,
        sendMagicLink: async ({ email, token, url }: { email: string; token: string; url: string }) => {
            // TODO: Implement email sending logic
            console.log(`Magic link sent to ${email}: ${url}`);
            // You can use services like Resend, SendGrid, or Nodemailer here
        },
    } : { enabled: false },
    email: SMTP_HOST ? {
        from: SMTP_FROM,
        smtp: {
            host: SMTP_HOST,
            port: parseInt(SMTP_PORT),
            user: SMTP_USER!,
            pass: SMTP_PASS!,
            secure: false, // true for 465, false for other ports
        },
    } : undefined,
    plugins: [
        expo(),
        ...(SMTP_HOST ? [magicLink({
            sendMagicLink: async ({ email, token, url }) => {
                // TODO: Implement email sending logic
                console.log(`Magic link sent to ${email}: ${url}`);
                // You can use services like Resend, SendGrid, or Nodemailer here
            },
        })] : []),
        bearer(),
        admin(),
    ],
    trustedOrigins: TRUSTED_ORIGINS ? TRUSTED_ORIGINS.split(",") : [],
});
