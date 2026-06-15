import { z } from "zod";

const fechaSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "fecha_desde debe tener formato YYYY-MM-DD");

export const sincronizarSapInsumosSchema = z.object({
  fecha_desde: fechaSchema,
});

export type SincronizarSapInsumosInput = z.infer<typeof sincronizarSapInsumosSchema>;
