import { z } from "zod";

const EnvsSchema = z.object({
  DATABASE_URL: z.string(),
  PORT: z.string().optional().default("5000"),
  NODE_ENV: z.string().optional().default("development"),

  // Auth
  BETTER_AUTH_SECRET: z.string(),
  BETTER_AUTH_URL: z.string(),

  // CORS & trusted origins
  CORS_ALLOWED_ORIGINS: z.string().optional(),
  TRUSTED_ORIGINS: z.string().optional(),

  // JWT
  JWT_SECRET: z.string().optional(),
  JWT_EXPIRES_IN: z.string().optional(),

  // Cloudflare R2
  CLOUDFLARE_ACCOUNT_ID: z.string(),
  CLOUDFLARE_ACCESS_KEY_ID: z.string(),
  CLOUDFLARE_SECRET_ACCESS_KEY: z.string(),
  CLOUDFLARE_BUCKET_NAME: z.string(),
  CLOUDFLARE_PUBLIC_URL: z.string().optional().default(""),

  // Email (optional — features are disabled when SMTP_HOST is absent)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional().default("587"),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional().default("noreply@menugo.com"),

  // Mobile app URL (for QR codes)
  APP_URL: z.string().optional().default("http://localhost:8081"),
});

const envs = EnvsSchema.parse(process.env);

export const {
  DATABASE_URL,
  PORT,
  NODE_ENV,
  BETTER_AUTH_SECRET,
  BETTER_AUTH_URL,
  CORS_ALLOWED_ORIGINS,
  TRUSTED_ORIGINS,
  JWT_SECRET,
  JWT_EXPIRES_IN,
  CLOUDFLARE_ACCOUNT_ID,
  CLOUDFLARE_ACCESS_KEY_ID,
  CLOUDFLARE_SECRET_ACCESS_KEY,
  CLOUDFLARE_BUCKET_NAME,
  CLOUDFLARE_PUBLIC_URL,
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM,
  APP_URL,
} = envs;
