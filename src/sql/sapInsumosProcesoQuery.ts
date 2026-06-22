/** Convierte YYYY-MM-DD a YYYYMMDD (formato BUDAT SAP). */
export function toSapDate(fromIsoDate: string): string {
  return fromIsoDate.replace(/-/g, "");
}

export function assertSapDate(value: string): void {
  if (!/^\d{8}$/.test(value)) {
    throw new Error("La fecha SAP debe tener formato YYYYMMDD");
  }
}

export function buildSapInsumosProcesoQuery(fromDateSap: string): string {
  assertSapDate(fromDateSap);

  return `
SELECT
    Werks,
    Fecha_Contabilizacion,
    Almacen,
    CAST(Codigo AS BIGINT) AS Codigo,
    Referencia,
    CAST(ROUND(SUM(Consumo), 0) AS INT) AS CONSUMO,
    CAST(ROUND(SUM(Averiado), 0) AS INT) AS AVERIADO,
    CAST(ROUND(SUM(Consumo + Averiado), 0) AS INT) AS TOTAL,
    Clasificacion
FROM (
    SELECT
        mseg.WERKS AS Werks,
        CONVERT(DATE, mkpf.BUDAT, 112) AS Fecha_Contabilizacion,
        mseg.LGORT AS Almacen,
        mseg.MATNR AS Codigo,
        makt.MAKTX AS Referencia,
        CASE
            WHEN mseg.LGORT = '3300' THEN 'INSUMO POLLO BENEFICIADO'
            WHEN mseg.LGORT = '3301' THEN 'INSUMO DESPRESADO'
            ELSE 'OTRO INSUMO'
        END AS Clasificacion,
        CASE
            WHEN mseg.BWART IN ('261', '201') THEN
                mseg.MENGE * CASE
                    WHEN CAST(mseg.MATNR AS BIGINT) = 110220 THEN 25000
                    WHEN CAST(mseg.MATNR AS BIGINT) = 110291 THEN 5000
                    ELSE 1
                END
            WHEN mseg.BWART IN ('262', '202') THEN
                -mseg.MENGE * CASE
                    WHEN CAST(mseg.MATNR AS BIGINT) = 110220 THEN 25000
                    WHEN CAST(mseg.MATNR AS BIGINT) = 110291 THEN 5000
                    ELSE 1
                END
            ELSE 0
        END AS Consumo,
        CASE
            WHEN mseg.BWART = '551' THEN
                mseg.MENGE * CASE
                    WHEN CAST(mseg.MATNR AS BIGINT) = 110220 THEN 25000
                    WHEN CAST(mseg.MATNR AS BIGINT) = 110291 THEN 5000
                    ELSE 1
                END
            WHEN mseg.BWART = '552' THEN
                -mseg.MENGE * CASE
                    WHEN CAST(mseg.MATNR AS BIGINT) = 110220 THEN 25000
                    WHEN CAST(mseg.MATNR AS BIGINT) = 110291 THEN 5000
                    ELSE 1
                END
            ELSE 0
        END AS Averiado
    FROM SAPSR3.MSEG AS mseg
    INNER JOIN SAPSR3.MKPF AS mkpf
        ON mseg.MANDT = mkpf.MANDT
        AND mseg.MBLNR = mkpf.MBLNR
        AND mseg.MJAHR = mkpf.MJAHR
    INNER JOIN SAPSR3.MAKT AS makt
        ON mseg.MANDT = makt.MANDT
        AND mseg.MATNR = makt.MATNR
        AND makt.SPRAS = 'S'
    INNER JOIN SAPSR3.MARA AS mara
        ON makt.MANDT = mara.MANDT
        AND makt.MATNR = mara.MATNR
    WHERE mkpf.BUDAT >= '${fromDateSap}'
      AND mseg.WERKS LIKE 'PB%'
      AND mseg.LGORT IN ('3300', '3301')
      AND mseg.BWART IN ('261', '262', '201', '202', '551', '552')
      AND (mara.MATKL IN ('EMPAQ001', 'EMPAQ003', 'CESTAS')
           OR mara.MTART IN ('ZEMP', 'VERP', 'ZGRJ'))
) AS DetalleConsolidado
WHERE Consumo <> 0 OR Averiado <> 0
GROUP BY
    Werks,
    Fecha_Contabilizacion,
    Almacen,
    Codigo,
    Referencia,
    Clasificacion
ORDER BY
    Fecha_Contabilizacion,
    Almacen,
    Codigo
`;
}
