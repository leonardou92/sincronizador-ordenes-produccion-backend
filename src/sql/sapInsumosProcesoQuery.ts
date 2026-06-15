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
    CAST(Codigo AS BIGINT) AS Codigo,
    Referencia,
    Unidades_Calculadas,
    0 AS promedio,
    0 AS kg,
    Clasificacion
FROM (
    SELECT
        MATNR AS Codigo,
        MAKTX AS Referencia,
        SUM(Cantidad_Neta_ST) AS Unidades_Calculadas,
        SUM(Cantidad_Neta_ST) AS Cantidad_Reporte,
        Unidad_Reporte AS Unidad,
        WERKS AS Werks,
        LGORT AS Almacen,
        Clasificacion AS Clasificacion,
        CONVERT(DATE, BUDAT, 112) AS Fecha_Contabilizacion
    FROM (
        SELECT
            mseg.MANDT,
            mseg.BWART,
            mseg.MATNR,
            makt.MAKTX,
            mseg.WERKS,
            mseg.LGORT,
            mkpf.BUDAT,
            'INSUMOS' AS Clasificacion,
            CASE
                WHEN COALESCE(marm.UMREZ, 0) > 0 THEN 'ST'
                ELSE mseg.MEINS
            END AS Unidad_Reporte,
            CASE
                WHEN COALESCE(marm.UMREZ, 0) > 0 THEN
                    ((CASE
                        WHEN mseg.BWART = '261' THEN mseg.MENGE
                        WHEN mseg.BWART = '262' THEN -mseg.MENGE
                        ELSE 0
                     END) * marm.UMREN) / marm.UMREZ
                ELSE
                    CASE
                        WHEN mseg.BWART = '261' THEN mseg.MENGE
                        WHEN mseg.BWART = '262' THEN -mseg.MENGE
                        ELSE 0
                    END
            END AS Cantidad_Neta_ST
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
        LEFT JOIN SAPSR3.MARM AS marm
            ON mseg.MANDT = marm.MANDT
            AND mseg.MATNR = marm.MATNR
            AND marm.MEINH = 'ST'
        WHERE mkpf.BUDAT >= '${fromDateSap}'
          AND mseg.WERKS LIKE 'PB%'
          AND mseg.LGORT = '3300'
          AND mseg.BWART IN ('261', '262')
          AND (mara.MATKL IN ('EMPAQ001', 'EMPAQ003', 'CESTAS')
               OR mara.MTART IN ('ZEMP', 'VERP', 'ZGRJ'))
    ) AS DetalleMovimientos
    GROUP BY
        MANDT,
        MATNR,
        MAKTX,
        Unidad_Reporte,
        WERKS,
        LGORT,
        Clasificacion,
        BUDAT
) AS ReporteFinal
WHERE Cantidad_Reporte > 0 OR Unidades_Calculadas > 0
ORDER BY
    Fecha_Contabilizacion,
    Werks,
    Almacen,
    Codigo
`;
}
