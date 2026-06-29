export interface SapCentro {
  werks: string;
  name1: string;
}

export interface SincronizarSapInsumosResultado {
  origen: "sap_sybase";
  fecha_desde: string;
  fecha_sap: string;
  filas_procesadas: number;
  filas_upsert: number;
  dias_con_datos: number;
}

export type SapInsumosProcesoExtraccion = Record<string, unknown>;
