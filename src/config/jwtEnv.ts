import { z } from "zod";

const jwtEnvSchema = z.object({
  JWT_SECRET: z.string().min(16, "JWT_SECRET debe tener al menos 16 caracteres"),
  JWT_EXPIRES_IN: z.string().default("8h"),
});

export type JwtEnv = z.infer<typeof jwtEnvSchema>;

export function getJwtEnv(): JwtEnv {
  const parsed = jwtEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`Configuración JWT incompleta (${details})`);
  }
  return parsed.data;
}

export function isJwtConfigured(): boolean {
  return Boolean(process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 16);
}
