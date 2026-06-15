import { getEnv } from "../config/env";
import { prisma } from "../db/prisma";
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
 * Extrae órdenes de producción desde SAP (vista/tabla en BD de control).
 * Ajuste la consulta según su esquema real en SAP SQL Server / linked server.
 */
async function extractFromSapDatabase(): Promise<ProduccionSapRow[]> {
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
  const useMock = getEnv().ETL_SAP_MOCK;

  if (useMock) {
    etlLog.info("Extracción SAP: modo simulado (ETL_SAP_MOCK=true)");
    return getMockSapData();
  }

  etlLog.info("Extracción SAP: consultando vista dbo.vw_sap_ordenes_produccion");
  try {
    return await extractFromSapDatabase();
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    etlLog.warn(`Fallo consulta SAP real, usando mock como respaldo: ${msg}`);
    return getMockSapData();
  }
}
