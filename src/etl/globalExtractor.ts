import type { ConnectionPool } from "mssql";
import mysql from "mysql2/promise";
import { getPlantPool, sql } from "../db/controlDb";
import { decryptPassword } from "../security/crypto";
import type { PlantaRow, ProduccionGlobalRow } from "../types/planta";
import { etlLog } from "./logger";

export async function extractFromPlanta(
  planta: PlantaRow
): Promise<ProduccionGlobalRow[]> {
  let pool: ConnectionPool | null = null;
  let password: string | null = null;

  try {
    password = decryptPassword(planta.contrasena_encriptada);

    if (planta.db_type === "mysql") {
      const conn = await mysql.createConnection({
        host: planta.host,
        port: planta.puerto,
        user: planta.usuario,
        password,
        database: planta.db_name,
      });
      try {
        const [rows] = await conn.query<any[]>(`
          SELECT
            orden_produccion,
            material,
            cantidad,
            unidad,
            fecha_produccion,
            centro
          FROM produccion_global
        `);

        return rows.map((row) => ({
          orden_produccion: String(row.orden_produccion),
          material: String(row.material),
          cantidad: Number(row.cantidad),
          unidad: String(row.unidad),
          fecha_produccion: new Date(row.fecha_produccion),
          centro: row.centro ?? null,
          origen_planta: planta.nombre_planta,
        }));
      } finally {
        await conn.end();
      }
    }

    pool = await getPlantPool({
      db_type: planta.db_type,
      host: planta.host,
      puerto: planta.puerto,
      db_name: planta.db_name,
      usuario: planta.usuario,
      password,
    });

    const result = await pool.request().query<Omit<ProduccionGlobalRow, "origen_planta">>(`
      SELECT
        orden_produccion,
        material,
        cantidad,
        unidad,
        fecha_produccion,
        centro
      FROM dbo.produccion_global
    `);

    return result.recordset.map((row) => ({
      ...row,
      origen_planta: planta.nombre_planta,
    }));
  } finally {
    if (password) {
      password = "";
    }
    if (pool) {
      await pool.close();
    }
  }
}

export async function safeExtractFromPlanta(
  planta: PlantaRow
): Promise<{ planta: string; ok: true; rows: ProduccionGlobalRow[] } | { planta: string; ok: false; error: string }> {
  try {
    const rows = await extractFromPlanta(planta);
    return { planta: planta.nombre_planta, ok: true, rows };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { planta: planta.nombre_planta, ok: false, error: message };
  }
}
