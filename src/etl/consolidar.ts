import { disconnectPrisma } from "../db/prisma";
import { listPlantasActivas } from "../services/plantasService";
import type { ProduccionConsolidada, ProduccionGlobalRow } from "../types/planta";
import { safeExtractFromPlanta } from "./globalExtractor";
import { etlLog } from "./logger";
import { mergeGlobalWithSap } from "./merge";
import { extractSapProduction } from "./sapExtractor";

interface EtlResumen {
  plantasProcesadas: string[];
  plantasFallidas: { planta: string; error: string }[];
  totalFilasGlobal: number;
  totalFilasSap: number;
  totalConsolidado: number;
  porEstadoCruce: Record<string, number>;
}

function resumirPorEstado(rows: ProduccionConsolidada[]): Record<string, number> {
  return rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.estado_cruce] = (acc[row.estado_cruce] ?? 0) + 1;
    return acc;
  }, {});
}

function imprimirMuestra(rows: ProduccionConsolidada[], limite = 10): void {
  etlLog.info(`Muestra consolidado (primeras ${limite} filas):`);
  console.table(
    rows.slice(0, limite).map((r) => ({
      origen: r.origen_planta,
      orden: r.orden_produccion,
      material: r.material,
      cant_global: r.cantidad,
      cant_sap: r.cantidad_sap,
      estado: r.estado_cruce,
    }))
  );
}

export async function ejecutarEtl(): Promise<EtlResumen> {
  etlLog.info("=== Inicio ETL consolidación producción ===");

  const plantasActivas = await listPlantasActivas();
  etlLog.info(`Plantas activas encontradas: ${plantasActivas.length}`);

  const globalAcumulado: ProduccionGlobalRow[] = [];
  const plantasProcesadas: string[] = [];
  const plantasFallidas: { planta: string; error: string }[] = [];

  for (const planta of plantasActivas) {
    etlLog.info(`Procesando planta: ${planta.nombre_planta} (${planta.host}/${planta.db_name})`);
    const resultado = await safeExtractFromPlanta(planta);

    if (resultado.ok) {
      globalAcumulado.push(...resultado.rows);
      plantasProcesadas.push(resultado.planta);
      etlLog.ok(
        `Planta ${resultado.planta}: ${resultado.rows.length} registros extraídos`
      );
    } else {
      plantasFallidas.push({ planta: resultado.planta, error: resultado.error });
      etlLog.error(`Planta ${resultado.planta} falló: ${resultado.error}`);
    }
  }

  etlLog.info("Extrayendo datos SAP...");
  const sapRows = await extractSapProduction();
  etlLog.ok(`SAP: ${sapRows.length} registros`);

  etlLog.info("Ejecutando cruce Global + SAP...");
  const consolidado = mergeGlobalWithSap(globalAcumulado, sapRows);

  const resumen: EtlResumen = {
    plantasProcesadas,
    plantasFallidas,
    totalFilasGlobal: globalAcumulado.length,
    totalFilasSap: sapRows.length,
    totalConsolidado: consolidado.length,
    porEstadoCruce: resumirPorEstado(consolidado),
  };

  etlLog.info("=== Resumen ETL ===");
  console.log(JSON.stringify(resumen, null, 2));
  imprimirMuestra(consolidado);

  if (plantasFallidas.length > 0) {
    etlLog.warn(
      `ETL finalizado con ${plantasFallidas.length} planta(s) con error. Las demás se procesaron.`
    );
  } else {
    etlLog.ok("ETL finalizado sin errores en plantas Global");
  }

  return resumen;
}

async function main(): Promise<void> {
  try {
    await ejecutarEtl();
  } finally {
    await disconnectPrisma();
  }
}

if (require.main === module) {
  main().catch((err) => {
    etlLog.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
