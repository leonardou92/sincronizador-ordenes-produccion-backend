import { getSyncCronEnv } from "../config/syncCronEnv";
import { isSybaseConfigured } from "../db/sybaseDb";
import { getPreviousAndCurrentMonthRange } from "../helpers/syncDateRange.helper";
import type { SincronizarProduccionProgramadoResultado } from "../types/produccionSync";
import { listPlantasActivas } from "./plantasService";
import { sincronizarPorPlanta } from "./sincronizarCompletoService";
import { sincronizarSapInsumosProceso } from "./sincronizarSapInsumosService";

export async function sincronizarProduccionProgramada(): Promise<SincronizarProduccionProgramadoResultado> {
  const cronEnv = getSyncCronEnv();
  const { fecha_desde, fecha_hasta } = getPreviousAndCurrentMonthRange(
    cronEnv.PRODUCCION_SYNC_CRON_TIMEZONE
  );

  const plantas = await listPlantasActivas();
  const plantasResultado = [];

  for (const planta of plantas) {
    if (planta.db_type !== "mysql") {
      plantasResultado.push({
        planta_id: planta.id,
        nombre_planta: planta.nombre_planta,
        codigo_planta: planta.codigo_planta,
        ok: false,
        error: `db_type=${planta.db_type} no soportado para sincronización programada`,
      });
      continue;
    }

    try {
      const resultado = await sincronizarPorPlanta(planta.id, {
        fecha_desde,
        fecha_hasta,
      });

      plantasResultado.push({
        planta_id: planta.id,
        nombre_planta: planta.nombre_planta,
        codigo_planta: planta.codigo_planta,
        ok: true,
        resultado,
      });
    } catch (error) {
      plantasResultado.push({
        planta_id: planta.id,
        nombre_planta: planta.nombre_planta,
        codigo_planta: planta.codigo_planta,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  let sap: SincronizarProduccionProgramadoResultado["sap"];

  if (!cronEnv.PRODUCCION_SYNC_INCLUDE_SAP) {
    sap = {
      ok: true,
      omitido: true,
      motivo: "PRODUCCION_SYNC_INCLUDE_SAP=false",
    };
  } else if (!isSybaseConfigured()) {
    sap = {
      ok: true,
      omitido: true,
      motivo: "Sybase SAP no configurado",
    };
  } else {
    try {
      const resultado = await sincronizarSapInsumosProceso({ fecha_desde });
      sap = { ok: true, resultado };
    } catch (error) {
      sap = {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  const plantasOk = plantasResultado.filter((p) => p.ok).length;

  return {
    fecha_desde,
    fecha_hasta,
    timezone: cronEnv.PRODUCCION_SYNC_CRON_TIMEZONE,
    plantas_total: plantasResultado.length,
    plantas_ok: plantasOk,
    plantas_error: plantasResultado.length - plantasOk,
    plantas: plantasResultado,
    sap,
  };
}
