import cron from "node-cron";
import { isLdapConfigured } from "../config/ldapEnv";
import { syncADUsers } from "../services/adSyncService";

let running = false;

type CronLogger = {
  info: (obj: unknown, msg?: string) => void;
  warn: (obj: unknown, msg?: string) => void;
  error: (obj: unknown, msg?: string) => void;
};

const consoleLogger: CronLogger = {
  info: (obj, msg) => console.log(msg ?? "[cron:ad-sync]", obj),
  warn: (obj, msg) => console.warn(msg ?? "[cron:ad-sync]", obj),
  error: (obj, msg) => console.error(msg ?? "[cron:ad-sync]", obj),
};

export function startAdSyncCron(logger: CronLogger = consoleLogger): void {
  if (process.env.LDAP_SYNC_CRON_ENABLED === "false") {
    logger.info({}, "Cron AD sync deshabilitado (LDAP_SYNC_CRON_ENABLED=false)");
    return;
  }

  if (!isLdapConfigured()) {
    logger.warn({}, "Cron AD sync omitido: configuración LDAP incompleta");
    return;
  }

  const expression = process.env.LDAP_SYNC_CRON ?? "0 2 * * *";
  if (!cron.validate(expression)) {
    logger.error({ expression }, "Expresión cron LDAP inválida");
    return;
  }

  const timezone = process.env.LDAP_SYNC_CRON_TIMEZONE;

  cron.schedule(
    expression,
    async () => {
      if (running) {
        logger.warn({}, "Sync AD omitida: ejecución anterior aún en curso");
        return;
      }

      running = true;
      logger.info({ expression, timezone }, "Iniciando sync AD programada");

      try {
        const result = await syncADUsers();
        logger.info(result, "Sync AD completada");
      } catch (error) {
        logger.error({ error }, "Error en sync AD programada");
      } finally {
        running = false;
      }
    },
    timezone ? { timezone } : undefined
  );

  logger.info({ expression, timezone }, "Cron AD sync programado");
}
