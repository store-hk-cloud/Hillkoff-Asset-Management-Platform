import { z } from "zod";

export const profileUpdateSchema = z.object({
  displayName: z.string().trim().min(1).max(120),
  phoneNumber: z
    .string()
    .trim()
    .max(30)
    .nullable()
    .transform((value) => value || null),
  photoURL: z
    .url()
    .nullable()
    .refine(
      (value) => value === null || value.startsWith("https://"),
      "Profile image URL must use HTTPS.",
    ),
  expectedVersion: z.number().int().nonnegative(),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
