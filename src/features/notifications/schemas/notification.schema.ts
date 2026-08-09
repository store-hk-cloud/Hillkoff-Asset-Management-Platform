import { z } from "zod";

import {
  NOTIFICATION_STATUSES,
  NOTIFICATION_TYPES,
} from "@/domain/entities/notification";

export const notificationSearchSchema = z.object({
  status: z.enum([...NOTIFICATION_STATUSES, "all"]).default("all"),
  type: z.enum([...NOTIFICATION_TYPES, "all"]).default("all"),
  limit: z.coerce.number().int().min(1).max(150).default(30),
});
export type NotificationSearchCriteria = z.infer<
  typeof notificationSearchSchema
>;
