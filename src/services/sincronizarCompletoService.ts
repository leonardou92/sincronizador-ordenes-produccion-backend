import type { SincronizarResumenInput } from "../schemas/sincronizar.schema";
import type { SincronizarCompletoResultado } from "../types/sincronizar";
import { sincronizarDetallePorPlanta } from "./sincronizarDetalleService";
import { sincronizarResumenPorPlanta } from "./sincronizarService";

export { SincronizarResumenError } from "./sincronizarService";
export { SincronizarDetalleError } from "./sincronizarDetalleService";

export async function sincronizarPorPlanta(
  plantaId: number,
  input: SincronizarResumenInput
): Promise<SincronizarCompletoResultado> {
  const resumen = await sincronizarResumenPorPlanta(plantaId, input);
  const detalle = await sincronizarDetallePorPlanta(plantaId, input);

  return {
    codigo_planta: resumen.codigo_planta,
    nombre_planta: resumen.nombre_planta,
    fecha_desde: resumen.fecha_desde,
    fecha_hasta: resumen.fecha_hasta,
    resumen: {
      filas_procesadas: resumen.filas_procesadas,
      filas_upsert: resumen.filas_upsert,
      dias_con_datos: resumen.dias_con_datos,
    },
    detalle: {
      filas_procesadas: detalle.filas_procesadas,
      filas_upsert: detalle.filas_upsert,
      dias_con_datos: detalle.dias_con_datos,
    },
  };
}
