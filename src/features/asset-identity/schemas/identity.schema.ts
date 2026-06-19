import { z } from "zod";

import { NFC_TAG_TYPES } from "@/domain/entities/nfc-registration";

export const nfcRegistrationSchema = z.object({
  tagType: z.enum(NFC_TAG_TYPES),
});

export const nfcVerificationSchema = z.object({
  observedUrl: z.url(),
  tagSerialNumber: z.string().trim().max(128).nullable(),
});
