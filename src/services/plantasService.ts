import type { ConfigPlantaGlobal } from "@prisma/client";
import { validatePlantConnection } from "../db/controlDb";
import { prisma } from "../db/prisma";
import { encryptPassword } from "../security/crypto";
import type { PlantaPublic, PlantaRow } from "../types/planta";
import type {
  CreatePlantaInput,
  TestConnectionInput,
  UpdatePlantaInput,
} from "../schemas/planta.schema";

const MASKED_PASSWORD = "********";

export class PlantConnectionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlantConnectionValidationError";
  }
}

export async function testPlantaConnection(input: TestConnectionInput): Promise<{
  ok: true;
  message: string;
  elapsed_ms: number;
}> {
  const startedAt = Date.now();
  try {
    await validatePlantConnection({
      db_type: input.db_type,
      host: input.host,
      puerto: input.puerto,
      db_name: input.db_name,
      usuario: input.usuario,
      password: input.contrasena,
    });
    return {
      ok: true,
      message: "Conexión exitosa",
      elapsed_ms: Date.now() - startedAt,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new PlantConnectionValidationError(
      `No se pudo conectar a la base de datos de la planta: ${message}`
    );
  }
}

function toPlantaRow(row: ConfigPlantaGlobal): PlantaRow {
  return {
    id: row.id,
    nombre_planta: row.nombre_planta,
    codigo_planta: row.codigo_planta,
    db_type: row.db_type as "mssql" | "mysql",
    host: row.host,
    puerto: row.puerto,
    db_name: row.db_name,
    usuario: row.usuario,
    contrasena_encriptada: row.contrasena_encriptada,
    activo: row.activo,
    fecha_creacion: row.fecha_creacion,
    fecha_actualizacion: row.fecha_actualizacion,
  };
}

function toPublic(row: ConfigPlantaGlobal): PlantaPublic {
  return {
    ...toPlantaRow(row),
    contrasena: MASKED_PASSWORD,
  };
}

async function assertCodigoPlantaDisponible(
  codigoPlanta: string,
  excludeId?: number
): Promise<void> {
  const otra = await prisma.configPlantaGlobal.findFirst({
    where: {
      codigo_planta: codigoPlanta,
      ...(excludeId !== undefined ? { NOT: { id: excludeId } } : {}),
    },
    select: { id: true, nombre_planta: true },
  });

  if (otra) {
    throw new PlantConnectionValidationError(
      `El codigo_planta "${codigoPlanta}" ya está registrado en la conexión "${otra.nombre_planta}" (id ${otra.id}).`
    );
  }
}

export async function createPlanta(input: CreatePlantaInput): Promise<PlantaPublic> {
  await assertCodigoPlantaDisponible(input.codigo_planta);

  await prisma.configPlantaGlobal.createMany({
    data: {
      nombre_planta: input.nombre_planta,
      codigo_planta: input.codigo_planta,
      db_type: input.db_type,
      host: input.host,
      puerto: input.puerto,
      db_name: input.db_name,
      usuario: input.usuario,
      contrasena_encriptada: encryptPassword(input.contrasena),
      activo: input.activo ?? true,
    },
  });

  const row = await prisma.configPlantaGlobal.findFirst({
    where: { nombre_planta: input.nombre_planta },
    orderBy: { id: "desc" },
  });
  if (!row) {
    throw new Error("La planta fue insertada pero no pudo ser recuperada.");
  }

  return toPublic(row);
}

export async function listPlantas(): Promise<PlantaPublic[]> {
  const rows = await prisma.configPlantaGlobal.findMany({
    orderBy: { nombre_planta: "asc" },
  });
  return rows.map(toPublic);
}

export async function getPlantaById(id: number): Promise<PlantaPublic | null> {
  const row = await prisma.configPlantaGlobal.findUnique({ where: { id } });
  return row ? toPublic(row) : null;
}

export async function getPlantaRowById(id: number): Promise<PlantaRow | null> {
  const row = await prisma.configPlantaGlobal.findUnique({ where: { id } });
  return row ? toPlantaRow(row) : null;
}

export async function updatePlanta(
  id: number,
  input: UpdatePlantaInput
): Promise<PlantaPublic | null> {
  const existing = await prisma.configPlantaGlobal.findUnique({ where: { id } });
  if (!existing) return null;

  const nextCodigoPlanta = input.codigo_planta ?? existing.codigo_planta;
  if (nextCodigoPlanta !== existing.codigo_planta) {
    await assertCodigoPlantaDisponible(nextCodigoPlanta, id);
  }

  const nextHost = input.host ?? existing.host;
  const nextPuerto = input.puerto ?? existing.puerto;
  const nextDbName = input.db_name ?? existing.db_name;
  const nextUsuario = input.usuario ?? existing.usuario;
  const nextDbType = (input.db_type ?? existing.db_type) as "mssql" | "mysql";
  const requiresConnectionValidation =
    input.db_type !== undefined ||
    input.host !== undefined ||
    input.puerto !== undefined ||
    input.db_name !== undefined ||
    input.usuario !== undefined ||
    input.contrasena !== undefined;

  if (requiresConnectionValidation) {
    if (!input.contrasena) {
      throw new PlantConnectionValidationError(
        "Para validar la conexión al actualizar host/puerto/bd/usuario debes enviar la contrasena en texto plano."
      );
    }

    try {
      await validatePlantConnection({
        db_type: nextDbType,
        host: nextHost,
        puerto: nextPuerto,
        db_name: nextDbName,
        usuario: nextUsuario,
        password: input.contrasena,
      });
    } catch (error) {
      if (error instanceof PlantConnectionValidationError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      throw new PlantConnectionValidationError(
        `No se pudo conectar a la base de datos de la planta: ${message}`
      );
    }
  }

  const row = await prisma.configPlantaGlobal.update({
    where: { id },
    data: {
      nombre_planta: input.nombre_planta,
      codigo_planta: input.codigo_planta,
      db_type: input.db_type,
      host: input.host,
      puerto: input.puerto,
      db_name: input.db_name,
      usuario: input.usuario,
      contrasena_encriptada: input.contrasena
        ? encryptPassword(input.contrasena)
        : undefined,
      activo: input.activo,
    },
  });

  return toPublic(row);
}

export async function listPlantasActivas(): Promise<PlantaRow[]> {
  const rows = await prisma.configPlantaGlobal.findMany({
    where: { activo: true },
    orderBy: { nombre_planta: "asc" },
  });
  return rows.map(toPlantaRow);
}

export async function deletePlanta(id: number): Promise<boolean> {
  const result = await prisma.configPlantaGlobal.deleteMany({
    where: { id },
  });
  return result.count > 0;
}
