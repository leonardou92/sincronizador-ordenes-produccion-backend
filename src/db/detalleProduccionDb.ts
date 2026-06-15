import sql, { type ConnectionPool } from "mssql";
import { buildSqlConfig } from "./controlDb";

export type DetalleProduccionRow = {
  codigo_planta: string;
  fecha_reporte: Date;
  codigo: string;
  referencia: string;
  unidades: number;
  promedio: number;
  kg: number;
  categoria: string;
};

export type DetalleProduccionListItem = DetalleProduccionRow & {
  id: string;
  fecha_sincronizacion: Date;
};

function bindDetalleParams(request: sql.Request, row: DetalleProduccionRow): sql.Request {
  return request
    .input("codigo_planta", sql.NVarChar(50), row.codigo_planta)
    .input("fecha_reporte", sql.Date, row.fecha_reporte)
    .input("codigo", sql.NVarChar(50), row.codigo)
    .input("referencia", sql.NVarChar(200), row.referencia)
    .input("unidades", sql.Decimal(18, 4), row.unidades)
    .input("promedio", sql.Decimal(10, 2), row.promedio)
    .input("kg", sql.Decimal(18, 4), row.kg)
    .input("categoria", sql.NVarChar(50), row.categoria);
}

async function updateDetalleRow(
  pool: ConnectionPool,
  row: DetalleProduccionRow
): Promise<number> {
  const result = await bindDetalleParams(pool.request(), row).query(`
    UPDATE dbo.tbl_ordenes_produccion_detalle
    SET
      unidades = @unidades,
      promedio = @promedio,
      kg = @kg,
      fecha_sincronizacion = SYSUTCDATETIME()
    WHERE codigo_planta = @codigo_planta
      AND fecha_reporte = @fecha_reporte
      AND codigo = @codigo
      AND referencia = @referencia
      AND categoria = @categoria
  `);

  return result.rowsAffected[0] ?? 0;
}

async function insertDetalleRow(pool: ConnectionPool, row: DetalleProduccionRow): Promise<void> {
  await bindDetalleParams(pool.request(), row).query(`
    INSERT INTO dbo.tbl_ordenes_produccion_detalle (
      codigo_planta,
      fecha_reporte,
      codigo,
      referencia,
      unidades,
      promedio,
      kg,
      categoria,
      fecha_sincronizacion
    )
    VALUES (
      @codigo_planta,
      @fecha_reporte,
      @codigo,
      @referencia,
      @unidades,
      @promedio,
      @kg,
      @categoria,
      SYSUTCDATETIME()
    )
  `);
}

export async function persistDetalleProduccionRows(rows: DetalleProduccionRow[]): Promise<number> {
  if (rows.length === 0) {
    return 0;
  }

  const pool = new sql.ConnectionPool(buildSqlConfig());
  await pool.connect();

  try {
    let guardadas = 0;
    for (const row of rows) {
      const updated = await updateDetalleRow(pool, row);
      if (updated === 0) {
        await insertDetalleRow(pool, row);
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

export async function listDetalleProduccion(
  codigoPlanta: string,
  fechaDesde: string,
  fechaHasta: string
): Promise<DetalleProduccionListItem[]> {
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
          codigo,
          referencia,
          unidades,
          promedio,
          kg,
          categoria,
          fecha_sincronizacion
        FROM dbo.tbl_ordenes_produccion_detalle
        WHERE codigo_planta = @codigo_planta
          AND fecha_reporte BETWEEN @fecha_desde AND @fecha_hasta
        ORDER BY fecha_reporte ASC, categoria ASC, codigo ASC, referencia ASC
      `);

    return result.recordset.map((row) => ({
      id: String(row.id),
      codigo_planta: row.codigo_planta,
      fecha_reporte: row.fecha_reporte,
      codigo: row.codigo,
      referencia: row.referencia,
      unidades: Number(row.unidades),
      promedio: Number(row.promedio),
      kg: Number(row.kg),
      categoria: row.categoria,
      fecha_sincronizacion: row.fecha_sincronizacion,
    }));
  } finally {
    await pool.close();
  }
}
