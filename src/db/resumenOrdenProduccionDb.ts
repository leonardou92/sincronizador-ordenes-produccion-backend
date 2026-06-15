import sql, { type ConnectionPool } from "mssql";
import { buildSqlConfig } from "./controlDb";

export type ResumenOrdenProduccionRow = {
  codigo_planta: string;
  fecha_reporte: Date;
  codigo_granja: string;
  nombre_granja: string;
  numero_documento: string;
  aves_granja: number;
  kg_granja: number;
  peso_prom_granja: number | null;
  aves_produccion: number;
  kg_produccion: number;
  peso_prom_produccion: number | null;
};

export type ResumenOrdenProduccionListItem = ResumenOrdenProduccionRow & {
  id: string;
  fecha_sincronizacion: Date;
};

function bindResumenParams(
  request: sql.Request,
  row: ResumenOrdenProduccionRow
): sql.Request {
  return request
    .input("codigo_planta", sql.NVarChar(50), row.codigo_planta)
    .input("fecha_reporte", sql.Date, row.fecha_reporte)
    .input("codigo_granja", sql.NVarChar(50), row.codigo_granja)
    .input("nombre_granja", sql.NVarChar(200), row.nombre_granja)
    .input("numero_documento", sql.NVarChar(100), row.numero_documento)
    .input("aves_granja", sql.Decimal(18, 4), row.aves_granja)
    .input("kg_granja", sql.Decimal(18, 4), row.kg_granja)
    .input("peso_prom_granja", sql.Decimal(10, 2), row.peso_prom_granja)
    .input("aves_produccion", sql.Decimal(18, 4), row.aves_produccion)
    .input("kg_produccion", sql.Decimal(18, 4), row.kg_produccion)
    .input("peso_prom_produccion", sql.Decimal(10, 2), row.peso_prom_produccion);
}

async function updateResumenRow(
  pool: ConnectionPool,
  row: ResumenOrdenProduccionRow
): Promise<number> {
  const result = await bindResumenParams(pool.request(), row).query(`
    UPDATE dbo.tbl_ordenes_produccion_resumen
    SET
      nombre_granja = @nombre_granja,
      aves_granja = @aves_granja,
      kg_granja = @kg_granja,
      peso_prom_granja = @peso_prom_granja,
      aves_produccion = @aves_produccion,
      kg_produccion = @kg_produccion,
      peso_prom_produccion = @peso_prom_produccion,
      fecha_sincronizacion = SYSUTCDATETIME()
    WHERE codigo_planta = @codigo_planta
      AND fecha_reporte = @fecha_reporte
      AND codigo_granja = @codigo_granja
      AND numero_documento = @numero_documento
  `);

  return result.rowsAffected[0] ?? 0;
}

async function insertResumenRow(
  pool: ConnectionPool,
  row: ResumenOrdenProduccionRow
): Promise<void> {
  await bindResumenParams(pool.request(), row).query(`
    INSERT INTO dbo.tbl_ordenes_produccion_resumen (
      codigo_planta,
      fecha_reporte,
      codigo_granja,
      nombre_granja,
      numero_documento,
      aves_granja,
      kg_granja,
      peso_prom_granja,
      aves_produccion,
      kg_produccion,
      peso_prom_produccion,
      fecha_sincronizacion
    )
    VALUES (
      @codigo_planta,
      @fecha_reporte,
      @codigo_granja,
      @nombre_granja,
      @numero_documento,
      @aves_granja,
      @kg_granja,
      @peso_prom_granja,
      @aves_produccion,
      @kg_produccion,
      @peso_prom_produccion,
      SYSUTCDATETIME()
    )
  `);
}

/** INSERT/UPDATE directo en SQL Server sin Prisma (evita dependencia de tempdb del driver). */
export async function persistResumenOrdenProduccionRows(
  rows: ResumenOrdenProduccionRow[]
): Promise<number> {
  if (rows.length === 0) {
    return 0;
  }

  const pool = new sql.ConnectionPool(buildSqlConfig());
  await pool.connect();

  try {
    let guardadas = 0;
    for (const row of rows) {
      const updated = await updateResumenRow(pool, row);
      if (updated === 0) {
        await insertResumenRow(pool, row);
      }
      guardadas += 1;
    }
    return guardadas;
  } finally {
    await pool.close();
  }
}

function parseFechaReporte(fecha: string): Date {
  const [year, month, day] = fecha.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/** Consulta resumen guardado en SQL Server por codigo_planta y rango de fechas. */
export async function listResumenOrdenProduccion(
  codigoPlanta: string,
  fechaDesde: string,
  fechaHasta: string
): Promise<ResumenOrdenProduccionListItem[]> {
  const pool = new sql.ConnectionPool(buildSqlConfig());
  await pool.connect();

  try {
    const result = await pool
      .request()
      .input("codigo_planta", sql.NVarChar(50), codigoPlanta)
      .input("fecha_desde", sql.Date, parseFechaReporte(fechaDesde))
      .input("fecha_hasta", sql.Date, parseFechaReporte(fechaHasta))
      .query(`
        SELECT
          id,
          codigo_planta,
          fecha_reporte,
          codigo_granja,
          nombre_granja,
          numero_documento,
          aves_granja,
          kg_granja,
          peso_prom_granja,
          aves_produccion,
          kg_produccion,
          peso_prom_produccion,
          fecha_sincronizacion
        FROM dbo.tbl_ordenes_produccion_resumen
        WHERE codigo_planta = @codigo_planta
          AND fecha_reporte BETWEEN @fecha_desde AND @fecha_hasta
        ORDER BY fecha_reporte DESC, numero_documento ASC, aves_granja DESC
      `);

    return result.recordset.map((row) => ({
      id: String(row.id),
      codigo_planta: row.codigo_planta,
      fecha_reporte: row.fecha_reporte,
      codigo_granja: row.codigo_granja,
      nombre_granja: row.nombre_granja,
      numero_documento: row.numero_documento,
      aves_granja: Number(row.aves_granja),
      kg_granja: Number(row.kg_granja),
      peso_prom_granja:
        row.peso_prom_granja === null ? null : Number(row.peso_prom_granja),
      aves_produccion: Number(row.aves_produccion),
      kg_produccion: Number(row.kg_produccion),
      peso_prom_produccion:
        row.peso_prom_produccion === null
          ? null
          : Number(row.peso_prom_produccion),
      fecha_sincronizacion: row.fecha_sincronizacion,
    }));
  } finally {
    await pool.close();
  }
}
