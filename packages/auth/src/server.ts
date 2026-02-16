import { betterAuth } from "better-auth";
import { expo } from "@better-auth/expo";
import { admin, bearer, magicLink } from "better-auth/plugins";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

export interface ServerAuthConfig {
    db: any;
    schema: { user: any; session: any; account: any; verification: any };
    trustedOrigins: string[];
    smtp?: {
        host: string;
        port: number;
        user: string;
        pass: string;
        from: string;
    };
}

export function createServerAuth(config: ServerAuthConfig) {
    const { db, schema, trustedOrigins, smtp } = config;

    return betterAuth({
        database: drizzleAdapter(db, {
            provider: "pg",
            schema,
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
                },
            },
            modelName: "user",
            changeEmail: {
                enabled: true,
            },
        },
        advanced: {
            disableCSRFCheck: true,
            useSecureCookies: false,
        },
        emailAndPassword: {
            enabled: true,
        },
        emailVerification: smtp
            ? {
                  sendOnSignUp: true,
                  autoSignInAfterVerification: true,
              }
            : undefined,
        magicLink: smtp
            ? {
                  enabled: true,
                  sendMagicLink: async ({
                      email,
                      token,
                      url,
                  }: {
                      email: string;
                      token: string;
                      url: string;
                  }) => {
                      console.log(`Magic link sent to ${email}: ${url}`);
                  },
              }
            : { enabled: false },
        email: smtp
            ? {
                  from: smtp.from,
                  smtp: {
                      host: smtp.host,
                      port: smtp.port,
                      user: smtp.user,
                      pass: smtp.pass,
                      secure: false,
                  },
              }
            : undefined,
        plugins: [
            expo(),
            ...(smtp
                ? [
                      magicLink({
                          sendMagicLink: async ({ email, token, url }) => {
                              console.log(
                                  `Magic link sent to ${email}: ${url}`
                              );
                          },
                      }),
                  ]
                : []),
            bearer(),
            admin(),
        ],
        trustedOrigins,
    });
}
