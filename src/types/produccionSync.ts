import type { SincronizarCompletoResultado } from "./sincronizar";
import type { SincronizarSapInsumosResultado } from "./sap";

export type SincronizarPlantaProgramadoResultado = {
  planta_id: number;
  nombre_planta: string;
  codigo_planta: string;
  ok: boolean;
  resultado?: SincronizarCompletoResultado;
  error?: string;
};

export type SincronizarSapProgramadoResultado = {
  ok: boolean;
  omitido?: boolean;
  motivo?: string;
  resultado?: SincronizarSapInsumosResultado;
  error?: string;
};

export type SincronizarProduccionProgramadoResultado = {
  fecha_desde: string;
  fecha_hasta: string;
  timezone: string;
  plantas_total: number;
  plantas_ok: number;
  plantas_error: number;
  plantas: SincronizarPlantaProgramadoResultado[];
  sap: SincronizarSapProgramadoResultado;
};
