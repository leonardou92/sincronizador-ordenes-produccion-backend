import { z } from "zod";

const fechaSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Las fechas deben tener formato YYYY-MM-DD");

const dashboardBaseSchema = z.object({
  codigo_planta: z.string().min(1).max(50),
  fecha_desde: fechaSchema,
  fecha_hasta: fechaSchema,
});

function withFechaRange<T extends z.ZodTypeAny>(schema: T) {
  return schema.refine(
    (data: { fecha_desde: string; fecha_hasta: string }) =>
      data.fecha_hasta >= data.fecha_desde,
    {
      message: "fecha_hasta no puede ser anterior a fecha_desde",
      path: ["fecha_hasta"],
    }
  );
}

export const dashboardQuerySchema = withFechaRange(dashboardBaseSchema);

export const dashboardTopQuerySchema = withFechaRange(
  dashboardBaseSchema.extend({
    limite: z.coerce.number().int().min(1).max(50).default(10),
  })
);

export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;
export type DashboardTopQuery = z.infer<typeof dashboardTopQuerySchema>;
