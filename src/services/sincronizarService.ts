import { queryPlantMysql } from "../db/controlDb";
import {
  persistResumenOrdenProduccionRows,
  type ResumenOrdenProduccionRow,
} from "../db/resumenOrdenProduccionDb";
import { RESUMEN_ORDENES_PRODUCCION_SQL, RESUMEN_ORDENES_PRODUCCION_DATE_PARAM_PAIRS } from "../sql/resumenOrdenesProduccionQuery";
import { buildMysqlDateRangeParams } from "../sql/mysqlDateParams";
import { decryptPassword } from "../security/crypto";
import type { SincronizarResumenInput } from "../schemas/sincronizar.schema";
import type {
  ResumenOrdenProduccionExtraccion,
  SincronizarResumenResultado,
} from "../types/resumen";
import { getPlantaRowById } from "./plantasService";

export class SincronizarResumenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SincronizarResumenError";
  }
}

function parseFechaReporte(fecha: string): Date {
  const [year, month, day] = fecha.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function parseFechaFromExtraccion(value: Date | string): Date {
  if (value instanceof Date) {
    return new Date(
      Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate())
    );
  }
  const iso = String(value);
  const soloFecha = iso.includes("T") ? iso.slice(0, 10) : iso.slice(0, 10);
  return parseFechaReporte(soloFecha);
}

function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === "") {
    return 0;
  }
  return Number(value);
}

function toOptionalNumber(
  value: number | string | null | undefined
): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  return Number(value);
}

function normalizeCodigoGranja(codigo: string | null | undefined): string {
  const trimmed = (codigo ?? "").trim();
  return trimmed.length > 0 ? trimmed : "__SIN_GRANJA__";
}

function normalizeNumeroDocumento(documento: string | null | undefined): string {
  const trimmed = (documento ?? "").trim();
  return trimmed.length > 0 ? trimmed : "Sin Documento";
}

function mapFilaToRow(
  fila: ResumenOrdenProduccionExtraccion,
  codigoPlanta: string
): ResumenOrdenProduccionRow {
  return {
    codigo_planta: codigoPlanta,
    fecha_reporte: parseFechaFromExtraccion(fila.fecha_reporte),
    codigo_granja: normalizeCodigoGranja(fila.codigo_granja),
    nombre_granja: fila.nombre_granja,
    numero_documento: normalizeNumeroDocumento(fila.numero_documento),
    aves_granja: toNumber(fila.aves_granja),
    kg_granja: toNumber(fila.kg_granja),
    peso_prom_granja: toOptionalNumber(fila.peso_prom_granja),
    aves_produccion: toNumber(fila.aves_produccion),
    kg_produccion: toNumber(fila.kg_produccion),
    peso_prom_produccion: toOptionalNumber(fila.peso_prom_produccion),
  };
}

export async function sincronizarResumenPorPlanta(
  plantaId: number,
  input: SincronizarResumenInput
): Promise<SincronizarResumenResultado> {
  const planta = await getPlantaRowById(plantaId);
  if (!planta) {
    throw new SincronizarResumenError("Planta no encontrada");
  }
  if (!planta.activo) {
    throw new SincronizarResumenError("La planta está inactiva");
  }
  if (planta.db_type !== "mysql") {
    throw new SincronizarResumenError(
      "La sincronización de resumen solo está disponible para conexiones db_type=mysql"
    );
  }

  const codigoPlanta = planta.codigo_planta.trim();
  if (!codigoPlanta) {
    throw new SincronizarResumenError("La conexión no tiene codigo_planta configurado");
  }

  const password = decryptPassword(planta.contrasena_encriptada);
  const filas = await queryPlantMysql<ResumenOrdenProduccionExtraccion>(
    {
      db_type: "mysql",
      host: planta.host,
      puerto: planta.puerto,
      db_name: planta.db_name,
      usuario: planta.usuario,
      password,
    },
    RESUMEN_ORDENES_PRODUCCION_SQL,
    buildMysqlDateRangeParams(
      input.fecha_desde,
      input.fecha_hasta,
      RESUMEN_ORDENES_PRODUCCION_DATE_PARAM_PAIRS,
    ),
  );

  const rows = filas.map((fila) => mapFilaToRow(fila, codigoPlanta));
  const filasUpsert = await persistResumenOrdenProduccionRows(rows);

  const diasConDatos = new Set(
    rows.map((row) => row.fecha_reporte.toISOString().slice(0, 10))
  ).size;

  return {
    codigo_planta: codigoPlanta,
    nombre_planta: planta.nombre_planta,
    fecha_desde: input.fecha_desde,
    fecha_hasta: input.fecha_hasta,
    filas_procesadas: filas.length,
    filas_upsert: filasUpsert,
    dias_con_datos: diasConDatos,
  };
}
