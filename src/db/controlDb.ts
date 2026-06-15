import sql, { type config as SqlConfig, type ConnectionPool } from "mssql";
import mysql from "mysql2/promise";
import { getEnv } from "../config/env";

type PlantConnectionConfig = {
  db_type: "mssql" | "mysql";
  host: string;
  puerto: number;
  db_name: string;
  usuario: string;
  password: string;
};

export function buildSqlConfig(overrides?: Partial<SqlConfig>): SqlConfig {
  const env = getEnv();
  return {
    server: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    options: {
      encrypt: env.DB_ENCRYPT ?? false,
      trustServerCertificate: env.DB_TRUST_SERVER_CERTIFICATE ?? true,
    },
    pool: {
      min: env.DB_POOL_MIN,
      max: env.DB_POOL_MAX,
    },
    ...overrides,
  };
}

function buildPlantSqlConfig(
  config: PlantConnectionConfig,
  optionsOverride?: { encrypt?: boolean; trustServerCertificate?: boolean }
): SqlConfig {
  const env = getEnv();
  const encrypt = optionsOverride?.encrypt ?? (env.DB_ENCRYPT ?? false);
  const trustServerCertificate =
    optionsOverride?.trustServerCertificate ??
    (env.DB_TRUST_SERVER_CERTIFICATE ?? true);

  return buildSqlConfig({
    server: config.host,
    port: config.puerto,
    user: config.usuario,
    password: config.password,
    database: config.db_name,
    options: {
      encrypt,
      trustServerCertificate,
    },
  });
}

async function connectPlantWithFallback(
  config: PlantConnectionConfig
): Promise<ConnectionPool> {
  const strategies = [
    // Respeta la config actual del entorno (default)
    { encrypt: getEnv().DB_ENCRYPT ?? false, trustServerCertificate: getEnv().DB_TRUST_SERVER_CERTIFICATE ?? true },
    // Fallbacks para errores de handshake/TLS en algunos SQL Server
    { encrypt: true, trustServerCertificate: true },
    { encrypt: false, trustServerCertificate: true },
  ];

  let lastError: unknown;
  for (const strategy of strategies) {
    const pool = new sql.ConnectionPool(buildPlantSqlConfig(config, strategy));
    try {
      await pool.connect();
      return pool;
    } catch (error) {
      lastError = error;
      await pool.close().catch(() => undefined);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

/** Conexión dinámica a la base Global de una planta (ETL). */
export async function getPlantPool(config: PlantConnectionConfig): Promise<ConnectionPool> {
  if (config.db_type !== "mssql") {
    throw new Error(`getPlantPool solo soporta mssql. Recibido: ${config.db_type}`);
  }
  return connectPlantWithFallback(config);
}

/**
 * Valida credenciales/conectividad de una planta Global con una consulta mínima.
 */
export async function validatePlantConnection(config: PlantConnectionConfig): Promise<void> {
  if (config.db_type === "mysql") {
    const conn = await mysql.createConnection({
      host: config.host,
      port: config.puerto,
      user: config.usuario,
      password: config.password,
      database: config.db_name,
    });
    try {
      await conn.query("SELECT 1 AS ok");
      return;
    } finally {
      await conn.end();
    }
  }

  let pool: ConnectionPool | null = null;
  try {
    pool = await getPlantPool(config);
    await pool.request().query("SELECT 1 AS ok");
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

/** Ejecuta una consulta en la base Global MySQL de una planta. */
export async function queryPlantMysql<T>(
  config: PlantConnectionConfig,
  query: string,
  params: unknown[] = []
): Promise<T[]> {
  if (config.db_type !== "mysql") {
    throw new Error(`queryPlantMysql solo soporta mysql. Recibido: ${config.db_type}`);
  }

  const conn = await mysql.createConnection({
    host: config.host,
    port: config.puerto,
    user: config.usuario,
    password: config.password,
    database: config.db_name,
  });

  try {
    const [rows] = await conn.query(query, params);
    return rows as T[];
  } finally {
    await conn.end();
  }
}

export type { PlantConnectionConfig };
export { sql };

let controlPool: ConnectionPool | null = null;
let controlPoolConnect: Promise<ConnectionPool> | null = null;

/** Pool compartido para SQL Server de control (evita reconectar en cada login). */
export async function getControlPool(): Promise<ConnectionPool> {
  if (controlPool?.connected) {
    return controlPool;
  }

  if (!controlPoolConnect) {
    controlPoolConnect = (async () => {
      const pool = new sql.ConnectionPool(buildSqlConfig());
      await pool.connect();
      controlPool = pool;
      return pool;
    })();
  }

  return controlPoolConnect;
}

export async function closeControlPool(): Promise<void> {
  if (controlPool) {
    await controlPool.close();
  }
  controlPool = null;
  controlPoolConnect = null;
}
