import {
  persistDetalleProduccionRows,
  type DetalleProduccionRow,
} from "../db/detalleProduccionDb";
import { isSybaseConfigured, querySybase } from "../db/sybaseDb";
import type { SincronizarSapInsumosInput } from "../schemas/sap.schema";
import {
  buildSapInsumosProcesoQuery,
  toSapDate,
} from "../sql/sapInsumosProcesoQuery";
import type {
  SapInsumosProcesoExtraccion,
  SincronizarSapInsumosResultado,
} from "../types/sap";

export class SincronizarSapInsumosError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SincronizarSapInsumosError";
  }
}

function parseFechaReporte(fecha: string): Date {
  const [year, month, day] = fecha.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function parseFechaFromExtraccion(value: unknown): Date {
  if (value instanceof Date) {
    return new Date(
      Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate())
    );
  }

  const text = String(value).trim();
  if (/^\d{8}$/.test(text)) {
    return parseFechaReporte(`${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}`);
  }

  return parseFechaReporte(text.slice(0, 10));
}

function getField(row: SapInsumosProcesoExtraccion, ...keys: string[]): unknown {
  const entries = Object.entries(row);
  for (const key of keys) {
    const found = entries.find(([k]) => k.toLowerCase() === key.toLowerCase());
    if (found) {
      return found[1];
    }
  }
  return undefined;
}

function toNumber(value: unknown): number {
  if (value === null || value === undefined || value === "") {
    return 0;
  }
  return Number(value);
}

function mapFilaToRow(fila: SapInsumosProcesoExtraccion): DetalleProduccionRow {
  const werks = getField(fila, "Werks", "WERKS");
  const codigo = getField(fila, "Codigo", "CODIGO");
  const referencia = getField(fila, "Referencia", "REFERENCIA");
  const consumo = getField(fila, "CONSUMO", "Consumo");
  const averiado = getField(fila, "AVERIADO", "Averiado");
  const total = getField(fila, "TOTAL", "Total");
  const clasificacion = getField(fila, "Clasificacion", "CLASIFICACION");
  const fecha = getField(fila, "Fecha_Contabilizacion", "FECHA_CONTABILIZACION");

  if (!werks || codigo === undefined || codigo === null) {
    throw new SincronizarSapInsumosError("Fila SAP incompleta: faltan Werks o Codigo");
  }

  return {
    codigo_planta: String(werks).trim(),
    fecha_reporte: parseFechaFromExtraccion(fecha),
    codigo: String(codigo).trim(),
    referencia: String(referencia ?? "").trim(),
    unidades: toNumber(total),
    promedio: toNumber(consumo),
    kg: toNumber(averiado),
    categoria: String(clasificacion ?? "OTRO INSUMO").trim(),
  };
}

export async function sincronizarSapInsumosProceso(
  input: SincronizarSapInsumosInput
): Promise<SincronizarSapInsumosResultado> {
  if (!isSybaseConfigured()) {
    throw new SincronizarSapInsumosError(
      "Sybase SAP no configurado. Defina SYBASE_* en .env y ejecute npm run sybase:patch"
    );
  }

  const fechaSap = toSapDate(input.fecha_desde);
  const query = buildSapInsumosProcesoQuery(fechaSap);
  const filas = await querySybase<SapInsumosProcesoExtraccion>(query);
  const rows = filas.map(mapFilaToRow);
  const filasUpsert = await persistDetalleProduccionRows(rows);

  const diasConDatos = new Set(
    rows.map((row) => row.fecha_reporte.toISOString().slice(0, 10))
  ).size;

  return {
    origen: "sap_sybase",
    fecha_desde: input.fecha_desde,
    fecha_sap: fechaSap,
    filas_procesadas: filas.length,
    filas_upsert: filasUpsert,
    dias_con_datos: diasConDatos,
  };
}
