import { betterAuth } from "better-auth";
import { expo } from "@better-auth/expo";
import { admin, bearer, magicLink } from "better-auth/plugins";
import { db } from "./src/db";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { user, session, account, verification } from "./src/db/schemas/auth.schema";

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
    emailVerification: process.env.SMTP_HOST ? {
        sendOnSignUp: true,
        autoSignInAfterVerification: true,
    } : undefined,
    magicLink: process.env.SMTP_HOST ? {
        enabled: true,
        sendMagicLink: async ({ email, token, url }: { email: string; token: string; url: string }) => {
            // TODO: Implement email sending logic
            console.log(`Magic link sent to ${email}: ${url}`);
            // You can use services like Resend, SendGrid, or Nodemailer here
        },
    } : { enabled: false },
    email: process.env.SMTP_HOST ? {
        from: process.env.SMTP_FROM || "noreply@menugo.com",
        smtp: {
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || "587"),
            user: process.env.SMTP_USER!,
            pass: process.env.SMTP_PASS!,
            secure: false, // true for 465, false for other ports
        },
    } : undefined,
    plugins: [
        expo(),
        ...(process.env.SMTP_HOST ? [magicLink({
            sendMagicLink: async ({ email, token, url }) => {
                // TODO: Implement email sending logic
                console.log(`Magic link sent to ${email}: ${url}`);
                // You can use services like Resend, SendGrid, or Nodemailer here
            },
        })] : []),
        bearer(),
        admin(),
    ],
    trustedOrigins: process.env.TRUSTED_ORIGINS ? process.env.TRUSTED_ORIGINS.split(",") : [],
});
