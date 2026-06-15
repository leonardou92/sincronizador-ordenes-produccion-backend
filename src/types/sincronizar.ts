import type { SincronizarDetalleResultado } from "./detalle";
import type { SincronizarResumenResultado } from "./resumen";

export type SincronizarTablaResultado = Pick<
  SincronizarResumenResultado,
  "filas_procesadas" | "filas_upsert" | "dias_con_datos"
>;

export interface SincronizarCompletoResultado {
  codigo_planta: string;
  nombre_planta: string;
  fecha_desde: string;
  fecha_hasta: string;
  resumen: SincronizarTablaResultado;
  detalle: SincronizarTablaResultado;
}
