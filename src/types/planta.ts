export interface PlantaRow {
  id: number;
  nombre_planta: string;
  codigo_planta: string;
  db_type: "mssql" | "mysql";
  host: string;
  puerto: number;
  db_name: string;
  usuario: string;
  contrasena_encriptada: string;
  activo: boolean;
  fecha_creacion?: Date;
  fecha_actualizacion?: Date;
}

export interface PlantaPublic {
  id: number;
  nombre_planta: string;
  codigo_planta: string;
  db_type: "mssql" | "mysql";
  host: string;
  puerto: number;
  db_name: string;
  usuario: string;
  contrasena: string;
  activo: boolean;
  fecha_creacion?: Date;
  fecha_actualizacion?: Date;
}

export interface ProduccionGlobalRow {
  orden_produccion: string;
  material: string;
  cantidad: number;
  unidad: string;
  fecha_produccion: Date;
  centro?: string | null;
  origen_planta: string;
}

export interface ProduccionSapRow {
  orden_produccion: string;
  material: string;
  cantidad: number;
  unidad: string;
  fecha_produccion: Date;
  centro: string;
}

export interface ProduccionConsolidada extends ProduccionGlobalRow {
  cantidad_sap: number | null;
  centro_sap: string | null;
  estado_cruce: "MATCH" | "SOLO_GLOBAL" | "SOLO_SAP" | "DIFERENCIA_CANTIDAD";
}
