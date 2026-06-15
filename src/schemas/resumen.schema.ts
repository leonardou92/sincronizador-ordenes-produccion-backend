import { z } from "zod";

const fechaSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Las fechas deben tener formato YYYY-MM-DD");

export const listarResumenQuerySchema = z
  .object({
    codigo_planta: z.string().min(1).max(50),
    fecha_desde: fechaSchema,
    fecha_hasta: fechaSchema,
  })
  .refine((data) => data.fecha_hasta >= data.fecha_desde, {
    message: "fecha_hasta no puede ser anterior a fecha_desde",
    path: ["fecha_hasta"],
  });

export type ListarResumenQuery = z.infer<typeof listarResumenQuerySchema>;
