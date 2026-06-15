import dotenv from "dotenv";
import { closeSybaseConnection, formatSybaseError, querySybase } from "../src/db/sybaseDb";
import { SAP_MARM_SAMPLE_QUERY } from "../src/sql/sapOrdenesProduccionQuery";
import { getEnv } from "../src/config/env";

dotenv.config();

async function main(): Promise<void> {
  const env = getEnv();

  console.log("Probando conexión SAP (Sybase ASE vía Java/jConnect)...");
  console.log(`Server: ${env.SYBASE_SERVER}:${env.SYBASE_PORT}`);
  console.log(`Database: ${env.SYBASE_DATABASE ?? "(no definida)"}`);

  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error("Timeout: conexión SAP superó 20 segundos")), 20000);
  });

  const rows = await Promise.race([
    querySybase<Record<string, unknown>>(SAP_MARM_SAMPLE_QUERY),
    timeout,
  ]);

  console.log(`Conexión OK. SAPSR3.MARM — ${rows.length} filas:`);
  console.log(rows);
}

main()
  .catch((err) => {
    const message = formatSybaseError(err).toLowerCase();
    console.error("Error de conexión Sybase:", formatSybaseError(err));

    if (message.includes("sybase_database")) {
      console.error("\nAgregue SYBASE_DATABASE=R3P en .env.");
    } else if (message.includes("login failed")) {
      console.error("\nLogin rechazado. Verifique usuario/contraseña y permisos jConnect.");
    } else if (message.includes("timeout") || message.includes("jz0la") || message.includes("cipher")) {
      console.error("\nEl servidor SAP exige cifrado de contraseña en red.");
      console.error("Su cliente SQL ('SAP kiri') probablemente usa Devart ODBC, no jConnect.");
      console.error("Sin licencia Devart, necesita que infra/DBA habilite jConnect o proporcione licencia ODBC.");
    } else if (message.includes("java")) {
      console.error("\nInstale Java 17+ y verifique que 'java' esté en el PATH.");
    }

    process.exit(1);
  })
  .finally(async () => {
    await closeSybaseConnection().catch(() => undefined);
  });
