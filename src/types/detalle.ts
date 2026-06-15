export interface DetalleProduccionExtraccion {
  fecha: Date | string;
  codigo: string;
  referencia: string;
  unidades: number | string;
  promedio: number | string;
  kg: number | string;
  categoria: string;
}

export interface SincronizarDetalleResultado {
  codigo_planta: string;
  nombre_planta: string;
  fecha_desde: string;
  fecha_hasta: string;
  filas_procesadas: number;
  filas_upsert: number;
  dias_con_datos: number;
}
