/**
 * Construye DATABASE_URL para Prisma (no requiere ENCRYPTION_KEY).
 * Formato: sqlserver://HOST:PORT;database=...;user=...;password=...;encrypt=...;trustServerCertificate=...
 */
function encodeParam(value: string): string {
  return encodeURIComponent(value);
}

export function buildDatabaseUrl(): string {
  if (process.env.DATABASE_URL?.trim()) {
    return process.env.DATABASE_URL.trim();
  }

  const host = process.env.DB_HOST;
  const port = process.env.DB_PORT ?? "1433";
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const database = process.env.DB_NAME;
  const encrypt = process.env.DB_ENCRYPT === "true" ? "true" : "false";
  const trust =
    process.env.DB_TRUST_SERVER_CERTIFICATE === "false" ? "false" : "true";

  if (!host || !user || !password || !database) {
    throw new Error(
      "Defina DATABASE_URL o las variables DB_HOST, DB_USER, DB_PASSWORD y DB_NAME"
    );
  }

  return [
    `sqlserver://${host}:${port}`,
    `database=${encodeParam(database)}`,
    `user=${encodeParam(user)}`,
    `password=${encodeParam(password)}`,
    `encrypt=${encrypt}`,
    `trustServerCertificate=${trust}`,
  ].join(";");
}

export function ensureDatabaseUrl(): void {
  if (!process.env.DATABASE_URL?.trim()) {
    process.env.DATABASE_URL = buildDatabaseUrl();
  }
}
