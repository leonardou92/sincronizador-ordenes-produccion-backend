-- Vista de ejemplo para ETL real (ETL_SAP_MOCK=false)
-- Adaptar nombres de tablas/columnas a su esquema SAP en SQL Server

/*
CREATE OR ALTER VIEW dbo.vw_sap_ordenes_produccion AS
SELECT
    Aufnr       AS orden_produccion,
    Matnr       AS material,
    Psmng       AS cantidad,
    Amein       AS unidad,
    CAST(Gstrp AS DATE) AS fecha_produccion,
    Werks       AS centro
FROM dbo.sap_ordenes_produccion_staging;
*/
