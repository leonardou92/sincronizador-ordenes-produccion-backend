import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { getEnv, type AppEnv } from "../config/env";

const JAVA_DIR = path.resolve(process.cwd(), "java");
const JCONN_JAR = path.join(JAVA_DIR, "lib", "jconn4.jar");

function resolveJavaBin(): string {
  if (process.env.JAVA_BIN?.trim()) {
    return process.env.JAVA_BIN.trim();
  }

  const bundledCandidates = fs
    .readdirSync(JAVA_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("jdk-"))
    .map((entry) => path.join(JAVA_DIR, entry.name, "bin", "java"));

  for (const candidate of bundledCandidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return "java";
}

export type SybaseEnv = Pick<
  AppEnv,
  "SYBASE_SERVER" | "SYBASE_PORT" | "SYBASE_UID" | "SYBASE_PWD" | "SYBASE_DATABASE"
>;

function getSybaseEnv(): SybaseEnv {
  const env = getEnv();
  if (!env.SYBASE_SERVER || !env.SYBASE_UID || !env.SYBASE_PWD) {
    throw new Error(
      "Defina SYBASE_SERVER, SYBASE_UID y SYBASE_PWD para conectar a SAP (Sybase ASE)"
    );
  }
  return env;
}

export function isSybaseConfigured(): boolean {
  const env = getEnv();
  return Boolean(env.SYBASE_SERVER && env.SYBASE_UID && env.SYBASE_PWD);
}

function formatSybaseError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function buildJavaClasspath(): string {
  return process.platform === "win32"
    ? `${JCONN_JAR};${JAVA_DIR}`
    : `${JCONN_JAR}:${JAVA_DIR}`;
}

export async function querySybase<T>(queryText: string): Promise<T[]> {
  const env = getSybaseEnv();
  const catalog = env.SYBASE_DATABASE?.trim() ?? "";
  const cp = buildJavaClasspath();

  return new Promise<T[]>((resolve, reject) => {
    const javaBin = resolveJavaBin();
    const child = spawn(
      javaBin,
      [
        "-cp",
        cp,
        "SybaseQueryCli",
        env.SYBASE_SERVER!,
        String(env.SYBASE_PORT),
        env.SYBASE_UID!,
        catalog,
        "-",
      ],
      {
        cwd: JAVA_DIR,
        env: {
          ...process.env,
          SYBASE_PWD: env.SYBASE_PWD!,
        },
        stdio: ["pipe", "pipe", "pipe"],
      }
    );

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || `SybaseQueryCli salió con código ${code}`));
        return;
      }

      try {
        resolve(JSON.parse(stdout.trim() || "[]") as T[]);
      } catch (error) {
        reject(
          new Error(
            `Respuesta JSON inválida: ${formatSybaseError(error)}. stdout=${stdout.slice(0, 200)}`
          )
        );
      }
    });

    child.stdin.write(queryText);
    child.stdin.end();
  });
}

export async function closeSybaseConnection(): Promise<void> {
  // Conexión por consulta; no hay pool que cerrar.
}

export { formatSybaseError };
