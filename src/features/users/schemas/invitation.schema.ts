import { z } from "zod";

export const redeemInvitationSchema = z.object({
  token: z.string().trim().min(32).max(256),
});
