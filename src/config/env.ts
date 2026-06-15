import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().default(1433),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  DB_NAME: z.string().min(1),
  DB_ENCRYPT: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  DB_TRUST_SERVER_CERTIFICATE: z
    .string()
    .optional()
    .transform((v) => v !== "false"),
  DB_POOL_MIN: z.coerce.number().default(2),
  DB_POOL_MAX: z.coerce.number().default(10),
  ENCRYPTION_KEY: z.string().min(1, "ENCRYPTION_KEY es obligatoria"),
  API_HOST: z.string().default("0.0.0.0"),
  API_PORT: z.coerce.number().default(3000),
  ETL_SAP_MOCK: z
    .string()
    .optional()
    .transform((v) => v !== "false"),
});

export type AppEnv = z.infer<typeof envSchema>;

let cachedEnv: AppEnv | null = null;

export function getEnv(): AppEnv {
  if (!cachedEnv) {
    const parsed = envSchema.safeParse(process.env);
    if (!parsed.success) {
      const details = parsed.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ");
      throw new Error(`Variables de entorno inválidas: ${details}`);
    }
    cachedEnv = parsed.data;
  }
  return cachedEnv;
}
