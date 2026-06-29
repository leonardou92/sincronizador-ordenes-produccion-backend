/** Centros de producción SAP (tabla T001W). */
export const SAP_CENTROS_QUERY = `
SELECT
    WERKS,
    NAME1
FROM SAPSR3.T001W
WHERE WERKS LIKE 'PB%'
  AND MANDT = 500
`;
