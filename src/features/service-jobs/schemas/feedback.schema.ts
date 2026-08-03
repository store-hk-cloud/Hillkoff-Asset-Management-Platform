import { z } from "zod";

const feedbackTokenPattern = /^[A-Za-z0-9_-]+$/;

export const feedbackTokenSchema = z
  .string()
  .trim()
  .min(32)
  .max(256)
  .regex(feedbackTokenPattern);

/**
 * The public feedback route validates its opaque path token separately from
 * this body so there is a single authoritative token source per request.
 */
export const publicFeedbackBodySchema = z
  .object({
    serviceScore: z.number().int().min(1).max(5),
    technicianScore: z.number().int().min(1).max(5),
    timelinessScore: z.number().int().min(1).max(5),
    comment: z.string().trim().max(2000),
  })
  .strict();

/** Backward-compatible combined command; Task 4 must use path token + body. */
export const publicFeedbackSchema = publicFeedbackBodySchema
  .extend({ token: feedbackTokenSchema })
  .strict();

export type PublicFeedbackPayload = z.infer<typeof publicFeedbackSchema>;
export type PublicFeedbackBodyPayload = z.infer<
  typeof publicFeedbackBodySchema
>;
