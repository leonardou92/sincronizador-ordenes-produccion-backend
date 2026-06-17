import cron from "node-cron";
import { getSyncCronEnv } from "../config/syncCronEnv";
import { sincronizarProduccionProgramada } from "../services/sincronizarProgramadoService";

let running = false;

type CronLogger = {
  info: (obj: unknown, msg?: string) => void;
  warn: (obj: unknown, msg?: string) => void;
  error: (obj: unknown, msg?: string) => void;
};

const consoleLogger: CronLogger = {
  info: (obj, msg) => console.log(msg ?? "[cron:produccion-sync]", obj),
  warn: (obj, msg) => console.warn(msg ?? "[cron:produccion-sync]", obj),
  error: (obj, msg) => console.error(msg ?? "[cron:produccion-sync]", obj),
};

export function startProduccionSyncCron(logger: CronLogger = consoleLogger): void {
  const cronEnv = getSyncCronEnv();

  if (!cronEnv.PRODUCCION_SYNC_CRON_ENABLED) {
    logger.info({}, "Cron producción deshabilitado (PRODUCCION_SYNC_CRON_ENABLED=false)");
    return;
  }

  const expression = cronEnv.PRODUCCION_SYNC_CRON;
  const timezone = cronEnv.PRODUCCION_SYNC_CRON_TIMEZONE;

  if (!cron.validate(expression)) {
    logger.error({ expression }, "Expresión cron de producción inválida");
    return;
  }

  cron.schedule(
    expression,
    async () => {
      if (running) {
        logger.warn({}, "Sync producción omitida: ejecución anterior aún en curso");
        return;
      }

      running = true;
      logger.info({ expression, timezone }, "Iniciando sync producción programada");

      try {
        const result = await sincronizarProduccionProgramada();
        logger.info(
          {
            fecha_desde: result.fecha_desde,
            fecha_hasta: result.fecha_hasta,
            plantas_ok: result.plantas_ok,
            plantas_error: result.plantas_error,
            sap_ok: result.sap.ok,
            sap_omitido: result.sap.omitido ?? false,
          },
          "Sync producción completada"
        );

        if (result.plantas_error > 0 || !result.sap.ok) {
          logger.warn(result, "Sync producción con errores parciales");
        }
      } catch (error) {
        logger.error({ error }, "Error en sync producción programada");
      } finally {
        running = false;
      }
    },
    { timezone }
  );

  logger.info({ expression, timezone }, "Cron producción programado");
}
