import { z } from "zod";

const requiredPublicValue = z.string().trim().min(1);

export const clientEnvironmentSchema = z.object({
  NEXT_PUBLIC_FIREBASE_API_KEY: requiredPublicValue,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: requiredPublicValue,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: requiredPublicValue,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: requiredPublicValue,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: requiredPublicValue,
  NEXT_PUBLIC_FIREBASE_APP_ID: requiredPublicValue,
  NEXT_PUBLIC_APP_URL: z.url(),
});

export const serverEnvironmentSchema = z.object({
  FIREBASE_ADMIN_PROJECT_ID: z.string().trim().min(1).optional(),
  FIREBASE_ADMIN_CLIENT_EMAIL: z.email().optional(),
  FIREBASE_ADMIN_PRIVATE_KEY: z.string().min(1).optional(),
  GOOGLE_CLOUD_PROJECT: z.string().trim().min(1).optional(),
  BIGQUERY_LOCATION: z.string().trim().min(1).default("asia-southeast1"),
  BIGQUERY_DATASET_PREFIX: z.string().trim().min(1).default("hillkoff_asset"),
  AUTH_SESSION_COOKIE_NAME: z
    .string()
    .trim()
    .min(1)
    .default("hillkoff_session"),
  AUTH_SESSION_EXPIRES_IN_DAYS: z.coerce
    .number()
    .int()
    .min(1)
    .max(14)
    .default(5),
});

export function getClientEnvironment() {
  return clientEnvironmentSchema.parse({
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID:
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:
      process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  });
}

export function getServerEnvironment() {
  return serverEnvironmentSchema.parse({
    FIREBASE_ADMIN_PROJECT_ID: process.env.FIREBASE_ADMIN_PROJECT_ID,
    FIREBASE_ADMIN_CLIENT_EMAIL: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    FIREBASE_ADMIN_PRIVATE_KEY: process.env.FIREBASE_ADMIN_PRIVATE_KEY,
    GOOGLE_CLOUD_PROJECT: process.env.GOOGLE_CLOUD_PROJECT,
    BIGQUERY_LOCATION: process.env.BIGQUERY_LOCATION,
    BIGQUERY_DATASET_PREFIX: process.env.BIGQUERY_DATASET_PREFIX,
    AUTH_SESSION_COOKIE_NAME: process.env.AUTH_SESSION_COOKIE_NAME,
    AUTH_SESSION_EXPIRES_IN_DAYS: process.env.AUTH_SESSION_EXPIRES_IN_DAYS,
  });
}
