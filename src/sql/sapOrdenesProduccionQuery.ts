/** Consulta de prueba — materiales / unidades de medida (SAPSR3.MARM). */
export const SAP_MARM_SAMPLE_QUERY = `
SELECT TOP 5
    MATNR,
    MEINH,
    UMREZ,
    UMREN
FROM SAPSR3.MARM
`;

/**
 * Consulta SAP en Sybase ASE para órdenes de producción.
 * Ajuste tablas/columnas según su esquema (p. ej. AFKO, AFPO, etc.).
 */
export const SAP_ORDENES_PRODUCCION_QUERY = `
SELECT TOP 100
    Aufnr       AS orden_produccion,
    Matnr       AS material,
    Psmng       AS cantidad,
    Amein       AS unidad,
    CAST(Gstrp AS DATE) AS fecha_produccion,
    Werks       AS centro
FROM sap_ordenes_produccion_staging
`;
