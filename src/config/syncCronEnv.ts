import { z } from "zod";

const syncCronEnvSchema = z.object({
  PRODUCCION_SYNC_CRON_ENABLED: z
    .string()
    .optional()
    .transform((v) => v !== "false"),
  PRODUCCION_SYNC_CRON: z.string().default("30 23 * * *"),
  PRODUCCION_SYNC_CRON_TIMEZONE: z.string().default("America/Caracas"),
  PRODUCCION_SYNC_INCLUDE_SAP: z
    .string()
    .optional()
    .transform((v) => v !== "false"),
});

export type SyncCronEnv = z.infer<typeof syncCronEnvSchema>;

export function getSyncCronEnv(): SyncCronEnv {
  return syncCronEnvSchema.parse(process.env);
}
