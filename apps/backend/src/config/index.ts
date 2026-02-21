import {
  PORT,
  NODE_ENV,
  DATABASE_URL,
  JWT_SECRET,
  JWT_EXPIRES_IN,
  CORS_ALLOWED_ORIGINS,
  CLOUDFLARE_ACCOUNT_ID,
  CLOUDFLARE_ACCESS_KEY_ID,
  CLOUDFLARE_SECRET_ACCESS_KEY,
  CLOUDFLARE_BUCKET_NAME,
  CLOUDFLARE_PUBLIC_URL,
  SKYEND_URL,
  SKYEND_API_KEY,
  SKYEND_CALLBACK_URL,
} from "../envs";

const allowedOrigins = CORS_ALLOWED_ORIGINS
  ? CORS_ALLOWED_ORIGINS.split(",")
  : ["http://localhost:3000", "http://localhost:8081"];

export const config = {
  port: PORT,
  nodeEnv: NODE_ENV,
  database: {
    url: DATABASE_URL,
  },
  jwt: {
    secret: JWT_SECRET || "your-secret-key-change-in-production",
    expiresIn: JWT_EXPIRES_IN || "7d",
  },
  cors: {
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  },
  storage: {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    r2: {
      accountId: CLOUDFLARE_ACCOUNT_ID,
      accessKeyId: CLOUDFLARE_ACCESS_KEY_ID,
      secretAccessKey: CLOUDFLARE_SECRET_ACCESS_KEY,
      bucketName: CLOUDFLARE_BUCKET_NAME,
      publicUrl: CLOUDFLARE_PUBLIC_URL,
    },
  },
  skyend: {
    url: SKYEND_URL,
    apiKey: SKYEND_API_KEY,
    callbackUrl: SKYEND_CALLBACK_URL,
  },
} as const;

export const isDevelopment = config.nodeEnv === "development";
export const isProduction = config.nodeEnv === "production";
