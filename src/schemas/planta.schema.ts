import { z } from "zod";

const dbTypeSchema = z.enum(["mssql", "mysql"]);

export const createPlantaSchema = z.object({
  nombre_planta: z.string().min(1).max(100),
  codigo_planta: z.string().min(1).max(50),
  db_type: dbTypeSchema.default("mssql"),
  host: z.string().min(1).max(255),
  puerto: z.coerce.number().int().min(1).max(65535).default(1433),
  db_name: z.string().min(1).max(128),
  usuario: z.string().min(1).max(128),
  contrasena: z.string().min(1),
  activo: z.boolean().optional().default(true),
});

export const updatePlantaSchema = z
  .object({
    nombre_planta: z.string().min(1).max(100).optional(),
    codigo_planta: z.string().min(1).max(50).optional(),
    db_type: dbTypeSchema.optional(),
    host: z.string().min(1).max(255).optional(),
    puerto: z.coerce.number().int().min(1).max(65535).optional(),
    db_name: z.string().min(1).max(128).optional(),
    usuario: z.string().min(1).max(128).optional(),
    contrasena: z.string().min(1).optional(),
    activo: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Debe enviar al menos un campo para actualizar",
  });

export const testConnectionSchema = z.object({
  db_type: dbTypeSchema.default("mssql"),
  host: z.string().min(1).max(255),
  puerto: z.coerce.number().int().min(1).max(65535),
  db_name: z.string().min(1).max(128),
  usuario: z.string().min(1).max(128),
  contrasena: z.string().min(1),
});

export type CreatePlantaInput = z.infer<typeof createPlantaSchema>;
export type UpdatePlantaInput = z.infer<typeof updatePlantaSchema>;
export type TestConnectionInput = z.infer<typeof testConnectionSchema>;
