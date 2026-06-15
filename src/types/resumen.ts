export interface ResumenOrdenProduccionExtraccion {
  fecha_reporte: Date | string;
  codigo_granja: string | null;
  nombre_granja: string;
  numero_documento: string;
  aves_granja: number | string;
  kg_granja: number | string;
  peso_prom_granja: number | string | null;
  aves_produccion: number | string;
  kg_produccion: number | string;
  peso_prom_produccion: number | string | null;
}

export interface SincronizarResumenResultado {
  codigo_planta: string;
  nombre_planta: string;
  fecha_desde: string;
  fecha_hasta: string;
  filas_procesadas: number;
  filas_upsert: number;
  dias_con_datos: number;
}
