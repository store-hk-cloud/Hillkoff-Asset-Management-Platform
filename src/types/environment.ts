import type { z } from "zod";

import type {
  clientEnvironmentSchema,
  serverEnvironmentSchema,
} from "@/lib/env";

export type ClientEnvironment = z.infer<typeof clientEnvironmentSchema>;
export type ServerEnvironment = z.infer<typeof serverEnvironmentSchema>;
