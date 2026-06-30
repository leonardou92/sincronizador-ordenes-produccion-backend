export type DashboardMeta = {
  codigo_planta: string;
  fecha_desde: string;
  fecha_hasta: string;
  generado_en: string;
};

export type DashboardKpis = {
  aves_granja: number;
  kg_granja: number;
  aves_produccion: number;
  kg_produccion: number;
  peso_prom_granja: number | null;
  peso_prom_produccion: number | null;
  rendimiento_kg_pct: number | null;
  rendimiento_aves_pct: number | null;
  granjas_activas: number;
  dias_con_datos: number;
  kg_detalle_total: number;
  unidades_detalle_total: number;
};

export type ProduccionDiariaItem = {
  fecha: string;
  aves_granja: number;
  kg_granja: number;
  aves_produccion: number;
  kg_produccion: number;
  peso_prom_granja: number | null;
  peso_prom_produccion: number | null;
};

export type GranjaRankingItem = {
  codigo_granja: string;
  nombre_granja: string;
  aves_granja: number;
  kg_granja: number;
  aves_produccion: number;
  kg_produccion: number;
  rendimiento_kg_pct: number | null;
};

export type CategoriaItem = {
  categoria: string;
  kg: number;
  unidades: number;
  porcentaje_kg: number;
};

export type CategoriaSerieItem = {
  fecha: string;
  categoria: string;
  kg: number;
};

export type TopProductoItem = {
  codigo: string;
  referencia: string;
  categoria: string;
  kg: number;
  unidades: number;
  promedio: number | null;
};

export type InsumoSapDiarioItem = {
  fecha: string;
  total: number;
  consumo: number;
  averiado: number;
  tasa_averia_pct: number | null;
};

export type InsumoSapCategoriaItem = {
  categoria: string;
  total: number;
  consumo: number;
  averiado: number;
  tasa_averia_pct: number | null;
};

export type EstadoSyncItem = {
  codigo_planta: string;
  nombre_planta: string;
  activo: boolean;
  ultima_sync_resumen: string | null;
  ultima_sync_detalle: string | null;
  ultimo_dato_resumen: string | null;
  ultimo_dato_detalle: string | null;
  filas_resumen: number;
  filas_detalle: number;
};
