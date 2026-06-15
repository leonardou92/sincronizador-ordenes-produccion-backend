import type {
  ProduccionConsolidada,
  ProduccionGlobalRow,
  ProduccionSapRow,
} from "../types/planta";

const CRUCE_KEYS = ["orden_produccion", "material"] as const;

function buildKey(row: Pick<ProduccionGlobalRow, "orden_produccion" | "material">): string {
  return `${row.orden_produccion}::${row.material}`;
}

/**
 * Cruce (full outer join lógico) entre producción Global consolidada y SAP.
 */
export function mergeGlobalWithSap(
  globalRows: ProduccionGlobalRow[],
  sapRows: ProduccionSapRow[]
): ProduccionConsolidada[] {
  const sapMap = new Map<string, ProduccionSapRow>();
  for (const row of sapRows) {
    sapMap.set(buildKey(row), row);
  }

  const processedKeys = new Set<string>();
  const resultado: ProduccionConsolidada[] = [];

  for (const global of globalRows) {
    const key = buildKey(global);
    processedKeys.add(key);
    const sap = sapMap.get(key);

    if (!sap) {
      resultado.push({
        ...global,
        cantidad_sap: null,
        centro_sap: null,
        estado_cruce: "SOLO_GLOBAL",
      });
      continue;
    }

    const cantidadIgual = Number(global.cantidad) === Number(sap.cantidad);
    resultado.push({
      ...global,
      cantidad_sap: sap.cantidad,
      centro_sap: sap.centro,
      estado_cruce: cantidadIgual ? "MATCH" : "DIFERENCIA_CANTIDAD",
    });
  }

  for (const sap of sapRows) {
    const key = buildKey(sap);
    if (processedKeys.has(key)) continue;

    resultado.push({
      orden_produccion: sap.orden_produccion,
      material: sap.material,
      cantidad: 0,
      unidad: sap.unidad,
      fecha_produccion: sap.fecha_produccion,
      centro: null,
      origen_planta: "SAP_SIN_GLOBAL",
      cantidad_sap: sap.cantidad,
      centro_sap: sap.centro,
      estado_cruce: "SOLO_SAP",
    });
  }

  return resultado;
}

export { CRUCE_KEYS };
