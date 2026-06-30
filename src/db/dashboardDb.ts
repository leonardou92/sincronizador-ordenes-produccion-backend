import sql from "mssql";
import { buildSqlConfig } from "./controlDb";
import type {
  CategoriaItem,
  CategoriaSerieItem,
  DashboardKpis,
  EstadoSyncItem,
  GranjaRankingItem,
  InsumoSapCategoriaItem,
  InsumoSapDiarioItem,
  ProduccionDiariaItem,
  TopProductoItem,
} from "../types/dashboard";

const CATEGORIAS_INSUMO_SAP = [
  "INSUMO POLLO BENEFICIADO",
  "INSUMO DESPRESADO",
  "OTRO INSUMO",
] as const;

function parseFechaReporte(fecha: string): Date {
  const [year, month, day] = fecha.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatDate(value: Date | string): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return String(value).slice(0, 10);
}

function formatDateTime(value: Date | string | null): string | null {
  if (value === null) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return String(value);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function round0(value: number): number {
  return Math.round(value);
}

function calcPct(numerator: number, denominator: number): number | null {
  if (denominator <= 0) {
    return null;
  }
  return round2((numerator / denominator) * 100);
}

function calcPromedio(total: number, count: number): number | null {
  if (count <= 0) {
    return null;
  }
  return round2(total / count);
}

async function withPool<T>(fn: (pool: sql.ConnectionPool) => Promise<T>): Promise<T> {
  const pool = new sql.ConnectionPool(buildSqlConfig());
  await pool.connect();
  try {
    return await fn(pool);
  } finally {
    await pool.close();
  }
}

function bindRango(
  request: sql.Request,
  codigoPlanta: string,
  fechaDesde: string,
  fechaHasta: string
): sql.Request {
  return request
    .input("codigo_planta", sql.NVarChar(50), codigoPlanta)
    .input("fecha_desde", sql.Date, parseFechaReporte(fechaDesde))
    .input("fecha_hasta", sql.Date, parseFechaReporte(fechaHasta));
}

export async function getDashboardKpis(
  codigoPlanta: string,
  fechaDesde: string,
  fechaHasta: string
): Promise<DashboardKpis> {
  return withPool(async (pool) => {
    const resumen = await bindRango(pool.request(), codigoPlanta, fechaDesde, fechaHasta).query(`
      SELECT
        ISNULL(SUM(aves_granja), 0) AS aves_granja,
        ISNULL(SUM(kg_granja), 0) AS kg_granja,
        ISNULL(SUM(aves_produccion), 0) AS aves_produccion,
        ISNULL(SUM(kg_produccion), 0) AS kg_produccion,
        COUNT(DISTINCT codigo_granja) AS granjas_activas,
        COUNT(DISTINCT fecha_reporte) AS dias_con_datos
      FROM dbo.tbl_ordenes_produccion_resumen
      WHERE codigo_planta = @codigo_planta
        AND fecha_reporte BETWEEN @fecha_desde AND @fecha_hasta
    `);

    const detalle = await bindRango(pool.request(), codigoPlanta, fechaDesde, fechaHasta).query(`
      SELECT
        ISNULL(SUM(kg), 0) AS kg_total,
        ISNULL(SUM(unidades), 0) AS unidades_total
      FROM dbo.tbl_ordenes_produccion_detalle
      WHERE codigo_planta = @codigo_planta
        AND fecha_reporte BETWEEN @fecha_desde AND @fecha_hasta
        AND categoria NOT IN (${CATEGORIAS_INSUMO_SAP.map((c) => `'${c}'`).join(", ")})
    `);

    const row = resumen.recordset[0];
    const det = detalle.recordset[0];
    const avesGranja = Number(row.aves_granja);
    const kgGranja = Number(row.kg_granja);
    const avesProduccion = Number(row.aves_produccion);
    const kgProduccion = Number(row.kg_produccion);

    return {
      aves_granja: round0(avesGranja),
      kg_granja: round2(kgGranja),
      aves_produccion: round0(avesProduccion),
      kg_produccion: round2(kgProduccion),
      peso_prom_granja: calcPromedio(kgGranja, avesGranja),
      peso_prom_produccion: calcPromedio(kgProduccion, avesProduccion),
      rendimiento_kg_pct: calcPct(kgProduccion, kgGranja),
      rendimiento_aves_pct: calcPct(avesProduccion, avesGranja),
      granjas_activas: Number(row.granjas_activas),
      dias_con_datos: Number(row.dias_con_datos),
      kg_detalle_total: round2(Number(det.kg_total)),
      unidades_detalle_total: round0(Number(det.unidades_total)),
    };
  });
}

export async function getProduccionDiaria(
  codigoPlanta: string,
  fechaDesde: string,
  fechaHasta: string
): Promise<ProduccionDiariaItem[]> {
  return withPool(async (pool) => {
    const result = await bindRango(pool.request(), codigoPlanta, fechaDesde, fechaHasta).query(`
      SELECT
        fecha_reporte,
        ISNULL(SUM(aves_granja), 0) AS aves_granja,
        ISNULL(SUM(kg_granja), 0) AS kg_granja,
        ISNULL(SUM(aves_produccion), 0) AS aves_produccion,
        ISNULL(SUM(kg_produccion), 0) AS kg_produccion
      FROM dbo.tbl_ordenes_produccion_resumen
      WHERE codigo_planta = @codigo_planta
        AND fecha_reporte BETWEEN @fecha_desde AND @fecha_hasta
      GROUP BY fecha_reporte
      ORDER BY fecha_reporte ASC
    `);

    return result.recordset.map((row) => {
      const avesGranja = Number(row.aves_granja);
      const kgGranja = Number(row.kg_granja);
      const avesProduccion = Number(row.aves_produccion);
      const kgProduccion = Number(row.kg_produccion);

      return {
        fecha: formatDate(row.fecha_reporte),
        aves_granja: round0(avesGranja),
        kg_granja: round2(kgGranja),
        aves_produccion: round0(avesProduccion),
        kg_produccion: round2(kgProduccion),
        peso_prom_granja: calcPromedio(kgGranja, avesGranja),
        peso_prom_produccion: calcPromedio(kgProduccion, avesProduccion),
      };
    });
  });
}

export async function getGranjasRanking(
  codigoPlanta: string,
  fechaDesde: string,
  fechaHasta: string
): Promise<GranjaRankingItem[]> {
  return withPool(async (pool) => {
    const result = await bindRango(pool.request(), codigoPlanta, fechaDesde, fechaHasta).query(`
      SELECT
        codigo_granja,
        MAX(nombre_granja) AS nombre_granja,
        ISNULL(SUM(aves_granja), 0) AS aves_granja,
        ISNULL(SUM(kg_granja), 0) AS kg_granja,
        ISNULL(SUM(aves_produccion), 0) AS aves_produccion,
        ISNULL(SUM(kg_produccion), 0) AS kg_produccion
      FROM dbo.tbl_ordenes_produccion_resumen
      WHERE codigo_planta = @codigo_planta
        AND fecha_reporte BETWEEN @fecha_desde AND @fecha_hasta
      GROUP BY codigo_granja
      ORDER BY SUM(kg_produccion) DESC, codigo_granja ASC
    `);

    return result.recordset.map((row) => {
      const kgGranja = Number(row.kg_granja);
      const kgProduccion = Number(row.kg_produccion);

      return {
        codigo_granja: row.codigo_granja,
        nombre_granja: row.nombre_granja,
        aves_granja: round0(Number(row.aves_granja)),
        kg_granja: round2(kgGranja),
        aves_produccion: round0(Number(row.aves_produccion)),
        kg_produccion: round2(kgProduccion),
        rendimiento_kg_pct: calcPct(kgProduccion, kgGranja),
      };
    });
  });
}

export async function getCategoriasDistribucion(
  codigoPlanta: string,
  fechaDesde: string,
  fechaHasta: string
): Promise<CategoriaItem[]> {
  return withPool(async (pool) => {
    const result = await bindRango(pool.request(), codigoPlanta, fechaDesde, fechaHasta).query(`
      SELECT
        categoria,
        ISNULL(SUM(kg), 0) AS kg,
        ISNULL(SUM(unidades), 0) AS unidades
      FROM dbo.tbl_ordenes_produccion_detalle
      WHERE codigo_planta = @codigo_planta
        AND fecha_reporte BETWEEN @fecha_desde AND @fecha_hasta
        AND categoria NOT IN (${CATEGORIAS_INSUMO_SAP.map((c) => `'${c}'`).join(", ")})
      GROUP BY categoria
      ORDER BY SUM(kg) DESC
    `);

    const totalKg = result.recordset.reduce((acc, row) => acc + Number(row.kg), 0);

    return result.recordset.map((row) => {
      const kg = Number(row.kg);
      return {
        categoria: row.categoria,
        kg: round2(kg),
        unidades: round0(Number(row.unidades)),
        porcentaje_kg: totalKg > 0 ? round2((kg / totalKg) * 100) : 0,
      };
    });
  });
}

export async function getCategoriasSerie(
  codigoPlanta: string,
  fechaDesde: string,
  fechaHasta: string
): Promise<CategoriaSerieItem[]> {
  return withPool(async (pool) => {
    const result = await bindRango(pool.request(), codigoPlanta, fechaDesde, fechaHasta).query(`
      SELECT
        fecha_reporte,
        categoria,
        ISNULL(SUM(kg), 0) AS kg
      FROM dbo.tbl_ordenes_produccion_detalle
      WHERE codigo_planta = @codigo_planta
        AND fecha_reporte BETWEEN @fecha_desde AND @fecha_hasta
        AND categoria NOT IN (${CATEGORIAS_INSUMO_SAP.map((c) => `'${c}'`).join(", ")})
      GROUP BY fecha_reporte, categoria
      ORDER BY fecha_reporte ASC, categoria ASC
    `);

    return result.recordset.map((row) => ({
      fecha: formatDate(row.fecha_reporte),
      categoria: row.categoria,
      kg: round2(Number(row.kg)),
    }));
  });
}

export async function getTopProductos(
  codigoPlanta: string,
  fechaDesde: string,
  fechaHasta: string,
  limite: number
): Promise<TopProductoItem[]> {
  return withPool(async (pool) => {
    const result = await bindRango(pool.request(), codigoPlanta, fechaDesde, fechaHasta)
      .input("limite", sql.Int, limite)
      .query(`
        SELECT TOP (@limite)
          codigo,
          referencia,
          categoria,
          ISNULL(SUM(kg), 0) AS kg,
          ISNULL(SUM(unidades), 0) AS unidades,
          CASE
            WHEN SUM(unidades) > 0 THEN SUM(kg) / SUM(unidades)
            ELSE NULL
          END AS promedio
        FROM dbo.tbl_ordenes_produccion_detalle
        WHERE codigo_planta = @codigo_planta
          AND fecha_reporte BETWEEN @fecha_desde AND @fecha_hasta
          AND categoria NOT IN (${CATEGORIAS_INSUMO_SAP.map((c) => `'${c}'`).join(", ")})
        GROUP BY codigo, referencia, categoria
        ORDER BY SUM(kg) DESC, codigo ASC
      `);

    return result.recordset.map((row) => ({
      codigo: row.codigo,
      referencia: row.referencia,
      categoria: row.categoria,
      kg: round2(Number(row.kg)),
      unidades: round0(Number(row.unidades)),
      promedio: row.promedio === null ? null : round2(Number(row.promedio)),
    }));
  });
}

export async function getInsumosSapDiario(
  codigoPlanta: string,
  fechaDesde: string,
  fechaHasta: string
): Promise<InsumoSapDiarioItem[]> {
  return withPool(async (pool) => {
    const result = await bindRango(pool.request(), codigoPlanta, fechaDesde, fechaHasta).query(`
      SELECT
        fecha_reporte,
        ISNULL(SUM(unidades), 0) AS total,
        ISNULL(SUM(promedio), 0) AS consumo,
        ISNULL(SUM(kg), 0) AS averiado
      FROM dbo.tbl_ordenes_produccion_detalle
      WHERE codigo_planta = @codigo_planta
        AND fecha_reporte BETWEEN @fecha_desde AND @fecha_hasta
        AND categoria IN (${CATEGORIAS_INSUMO_SAP.map((c) => `'${c}'`).join(", ")})
      GROUP BY fecha_reporte
      ORDER BY fecha_reporte ASC
    `);

    return result.recordset.map((row) => {
      const total = Number(row.total);
      const consumo = Number(row.consumo);
      const averiado = Number(row.averiado);
      const base = consumo + averiado;

      return {
        fecha: formatDate(row.fecha_reporte),
        total: round2(total),
        consumo: round2(consumo),
        averiado: round2(averiado),
        tasa_averia_pct: calcPct(averiado, base),
      };
    });
  });
}

export async function getInsumosSapPorCategoria(
  codigoPlanta: string,
  fechaDesde: string,
  fechaHasta: string
): Promise<InsumoSapCategoriaItem[]> {
  return withPool(async (pool) => {
    const result = await bindRango(pool.request(), codigoPlanta, fechaDesde, fechaHasta).query(`
      SELECT
        categoria,
        ISNULL(SUM(unidades), 0) AS total,
        ISNULL(SUM(promedio), 0) AS consumo,
        ISNULL(SUM(kg), 0) AS averiado
      FROM dbo.tbl_ordenes_produccion_detalle
      WHERE codigo_planta = @codigo_planta
        AND fecha_reporte BETWEEN @fecha_desde AND @fecha_hasta
        AND categoria IN (${CATEGORIAS_INSUMO_SAP.map((c) => `'${c}'`).join(", ")})
      GROUP BY categoria
      ORDER BY SUM(unidades) DESC
    `);

    return result.recordset.map((row) => {
      const consumo = Number(row.consumo);
      const averiado = Number(row.averiado);
      const base = consumo + averiado;

      return {
        categoria: row.categoria,
        total: round2(Number(row.total)),
        consumo: round2(consumo),
        averiado: round2(averiado),
        tasa_averia_pct: calcPct(averiado, base),
      };
    });
  });
}

export async function getEstadoSync(codigoPlanta?: string): Promise<EstadoSyncItem[]> {
  return withPool(async (pool) => {
    const request = pool.request();
    const filtroPlanta =
      codigoPlanta !== undefined
        ? request.input("codigo_planta", sql.NVarChar(50), codigoPlanta)
        : request;

    const result = await filtroPlanta.query(`
      SELECT
        p.codigo_planta,
        p.nombre_planta,
        p.activo,
        r.ultima_sync_resumen,
        r.ultimo_dato_resumen,
        r.filas_resumen,
        d.ultima_sync_detalle,
        d.ultimo_dato_detalle,
        d.filas_detalle
      FROM dbo.tbl_config_plantas_global p
      LEFT JOIN (
        SELECT
          codigo_planta,
          MAX(fecha_sincronizacion) AS ultima_sync_resumen,
          MAX(fecha_reporte) AS ultimo_dato_resumen,
          COUNT(*) AS filas_resumen
        FROM dbo.tbl_ordenes_produccion_resumen
        ${codigoPlanta !== undefined ? "WHERE codigo_planta = @codigo_planta" : ""}
        GROUP BY codigo_planta
      ) r ON r.codigo_planta = p.codigo_planta
      LEFT JOIN (
        SELECT
          codigo_planta,
          MAX(fecha_sincronizacion) AS ultima_sync_detalle,
          MAX(fecha_reporte) AS ultimo_dato_detalle,
          COUNT(*) AS filas_detalle
        FROM dbo.tbl_ordenes_produccion_detalle
        ${codigoPlanta !== undefined ? "WHERE codigo_planta = @codigo_planta" : ""}
        GROUP BY codigo_planta
      ) d ON d.codigo_planta = p.codigo_planta
      ${codigoPlanta !== undefined ? "WHERE p.codigo_planta = @codigo_planta" : ""}
      ORDER BY p.nombre_planta ASC
    `);

    return result.recordset.map((row) => ({
      codigo_planta: row.codigo_planta,
      nombre_planta: row.nombre_planta,
      activo: Boolean(row.activo),
      ultima_sync_resumen: formatDateTime(row.ultima_sync_resumen),
      ultima_sync_detalle: formatDateTime(row.ultima_sync_detalle),
      ultimo_dato_resumen: row.ultimo_dato_resumen
        ? formatDate(row.ultimo_dato_resumen)
        : null,
      ultimo_dato_detalle: row.ultimo_dato_detalle
        ? formatDate(row.ultimo_dato_detalle)
        : null,
      filas_resumen: Number(row.filas_resumen ?? 0),
      filas_detalle: Number(row.filas_detalle ?? 0),
    }));
  });
}
