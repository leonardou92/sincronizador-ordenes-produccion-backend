import { queryPlantMysql } from "../db/controlDb";
import { persistDetalleProduccionRows, type DetalleProduccionRow } from "../db/detalleProduccionDb";
import { DETALLE_PRODUCCION_SQL } from "../sql/detalleProduccionQuery";
import { decryptPassword } from "../security/crypto";
import type { SincronizarResumenInput } from "../schemas/sincronizar.schema";
import type {
  DetalleProduccionExtraccion,
  SincronizarDetalleResultado,
} from "../types/detalle";
import { getPlantaRowById } from "./plantasService";

export class SincronizarDetalleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SincronizarDetalleError";
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
  return parseFechaReporte(String(value).slice(0, 10));
}

function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === "") {
    return 0;
  }
  return Number(value);
}

function mapFilaToRow(
  fila: DetalleProduccionExtraccion,
  codigoPlanta: string
): DetalleProduccionRow {
  return {
    codigo_planta: codigoPlanta,
    fecha_reporte: parseFechaFromExtraccion(fila.fecha),
    codigo: String(fila.codigo).trim(),
    referencia: String(fila.referencia).trim(),
    unidades: toNumber(fila.unidades),
    promedio: toNumber(fila.promedio),
    kg: toNumber(fila.kg),
    categoria: String(fila.categoria).trim(),
  };
}

export async function sincronizarDetallePorPlanta(
  plantaId: number,
  input: SincronizarResumenInput
): Promise<SincronizarDetalleResultado> {
  const planta = await getPlantaRowById(plantaId);
  if (!planta) {
    throw new SincronizarDetalleError("Planta no encontrada");
  }
  if (!planta.activo) {
    throw new SincronizarDetalleError("La planta está inactiva");
  }
  if (planta.db_type !== "mysql") {
    throw new SincronizarDetalleError(
      "La sincronización de detalle solo está disponible para conexiones db_type=mysql"
    );
  }

  const codigoPlanta = planta.codigo_planta.trim();
  if (!codigoPlanta) {
    throw new SincronizarDetalleError("La conexión no tiene codigo_planta configurado");
  }

  const password = decryptPassword(planta.contrasena_encriptada);
  const filas = await queryPlantMysql<DetalleProduccionExtraccion>(
    {
      db_type: "mysql",
      host: planta.host,
      puerto: planta.puerto,
      db_name: planta.db_name,
      usuario: planta.usuario,
      password,
    },
    DETALLE_PRODUCCION_SQL,
    [input.fecha_desde, input.fecha_hasta]
  );

  const rows = filas.map((fila) => mapFilaToRow(fila, codigoPlanta));
  const filasUpsert = await persistDetalleProduccionRows(rows);

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
