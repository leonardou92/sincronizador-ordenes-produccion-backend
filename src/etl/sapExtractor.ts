import { getEnv } from "../config/env";
import { prisma } from "../db/prisma";
import { isSybaseConfigured, querySybase } from "../db/sybaseDb";
import { SAP_ORDENES_PRODUCCION_QUERY } from "../sql/sapOrdenesProduccionQuery";
import type { ProduccionSapRow } from "../types/planta";
import { etlLog } from "./logger";

/**
 * Dataset simulado de SAP para desarrollo y pruebas.
 */
function getMockSapData(): ProduccionSapRow[] {
  return [
    {
      orden_produccion: "OP-1001",
      material: "MAT-A",
      cantidad: 100,
      unidad: "KG",
      fecha_produccion: new Date("2025-05-01"),
      centro: "CE01",
    },
    {
      orden_produccion: "OP-1002",
      material: "MAT-B",
      cantidad: 250,
      unidad: "UN",
      fecha_produccion: new Date("2025-05-02"),
      centro: "CE02",
    },
    {
      orden_produccion: "OP-9999",
      material: "MAT-Z",
      cantidad: 10,
      unidad: "KG",
      fecha_produccion: new Date("2025-05-03"),
      centro: "CE01",
    },
  ];
}

/**
 * Extrae órdenes de producción desde SAP vía Sybase ASE (ODBC).
 */
async function extractFromSybaseSap(): Promise<ProduccionSapRow[]> {
  if (!isSybaseConfigured()) {
    throw new Error(
      "ETL_SAP_SOURCE=sybase pero faltan SYBASE_SERVER, SYBASE_UID o SYBASE_PWD"
    );
  }

  const rows = await querySybase<ProduccionSapRow>(SAP_ORDENES_PRODUCCION_QUERY);
  return rows.map((row) => ({
    ...row,
    cantidad: Number(row.cantidad),
    fecha_produccion: new Date(row.fecha_produccion),
  }));
}

/**
 * Extrae órdenes de producción desde SAP (vista/tabla en BD de control).
 * Ajuste la consulta según su esquema real en SAP SQL Server / linked server.
 */
async function extractFromControlDb(): Promise<ProduccionSapRow[]> {
  return prisma.$queryRaw<ProduccionSapRow[]>`
    SELECT
      orden_produccion,
      material,
      cantidad,
      unidad,
      fecha_produccion,
      centro
    FROM dbo.vw_sap_ordenes_produccion
  `;
}

export async function extractSapProduction(): Promise<ProduccionSapRow[]> {
  const env = getEnv();
  const useMock = env.ETL_SAP_MOCK;

  if (useMock) {
    etlLog.info("Extracción SAP: modo simulado (ETL_SAP_MOCK=true)");
    return getMockSapData();
  }

  const source = env.ETL_SAP_SOURCE;
  etlLog.info(`Extracción SAP: origen ${source}`);

  try {
    if (source === "sybase") {
      return await extractFromSybaseSap();
    }
    return await extractFromControlDb();
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    etlLog.warn(`Fallo consulta SAP real (${source}), usando mock como respaldo: ${msg}`);
    return getMockSapData();
  }
}
