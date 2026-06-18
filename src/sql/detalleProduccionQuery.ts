/**
 * Reporte maestro consolidado desde Global (MySQL).
 * Parámetros (×5): fecha_desde, fecha_hasta (YYYY-MM-DD) por cada bloque.
 * Sin CTE: compatible con MySQL 5.7.
 */
export const DETALLE_PRODUCCION_SQL = `
SELECT fecha, codigo, referencia, unidades, promedio, kg, categoria
FROM (
    -- Bloque 1: Pollo Beneficiado (dinámico por tipo_uso_id = 2)
    SELECT
        t.fecha AS fecha,
        p.codigo AS codigo,
        p.nombre AS referencia,
        COALESCE(SUM(t.piezas), 0) AS unidades,
        COALESCE(ROUND(SUM(t.neto) / NULLIF(SUM(t.piezas), 0), 2), 0) AS promedio,
        COALESCE(ROUND(SUM(t.neto), 2), 0) AS kg,
        'POLLO BENEFICIADO' AS categoria
    FROM producto p
    INNER JOIN transaccion t ON t.producto_id = p.id
    WHERE t.fecha BETWEEN ? AND ?
      AND t.estatus_id = 3
      AND t.status_id = 101
      AND p.tipo_uso_id = 2
      AND t.deleted_at IS NULL
    GROUP BY
        t.fecha,
        p.id,
        p.codigo,
        p.nombre

    UNION ALL

    -- Bloque 2: Vísceras / Subproductos (dinámico por tipo_uso_id = 85)
    SELECT
        t.fecha AS fecha,
        p.codigo AS codigo,
        p.nombre AS referencia,
        0 AS unidades,
        0 AS promedio,
        COALESCE(ROUND(SUM(t.neto), 2), 0) AS kg,
        'VICERAS' AS categoria
    FROM producto p
    INNER JOIN transaccion t ON t.producto_id = p.id
    WHERE t.fecha BETWEEN ? AND ?
      AND t.estatus_id IN (3, 48)
      AND t.status_id = 101
      AND p.tipo_uso_id = 85
      AND t.deleted_at IS NULL
    GROUP BY
        t.fecha,
        p.id,
        p.codigo,
        p.nombre

    UNION ALL

    -- Bloque 3: Aves Ahogadas (extracción desde JSON de Pollo Vivo)
    SELECT
        t.fecha AS fecha,
        '300002' AS codigo,
        'Aves ahogadas' AS referencia,
        COALESCE(SUM(CAST(t.adicional->>'$.descartes[0].pollo_ahogado_cantidad' AS UNSIGNED)), 0) AS unidades,
        COALESCE(ROUND(
            SUM(CAST(t.adicional->>'$.descartes[0].pollo_ahogado_neto' AS DECIMAL(15,2)))
            / NULLIF(SUM(CAST(t.adicional->>'$.descartes[0].pollo_ahogado_cantidad' AS UNSIGNED)), 0),
            2
        ), 0) AS promedio,
        COALESCE(ROUND(SUM(CAST(t.adicional->>'$.descartes[0].pollo_ahogado_neto' AS DECIMAL(15,2))), 2), 0) AS kg,
        'AVES AHOGADAS' AS categoria
    FROM transaccion t
    INNER JOIN producto p ON t.producto_id = p.id
    WHERE t.fecha BETWEEN ? AND ?
      AND p.codigo = '300002'
      AND t.status_id = 101
      AND t.deleted_at IS NULL
      AND t.adicional LIKE '%pollo_ahogado_neto%'
    GROUP BY t.fecha

    UNION ALL

    -- Bloque 4: Despresado consolidado
    SELECT
        fecha,
        producto_codigo AS codigo,
        producto_nombre AS referencia,
        COALESCE(SUM(piezas), 0) AS unidades,
        COALESCE(ROUND(SUM(kilos) / NULLIF(SUM(piezas), 0), 2), 0) AS promedio,
        COALESCE(ROUND(SUM(kilos), 2), 0) AS kg,
        clasificacion AS categoria
    FROM (
        -- Sub-bloque 4.1: Entradas (materia prima de despresado)
        SELECT
            t.fecha AS fecha,
            p.codigo AS producto_codigo,
            p.nombre AS producto_nombre,
            t.neto AS kilos,
            t.piezas,
            'DESPRESADO - ENTRADAS (Materia Prima)' AS clasificacion
        FROM transaccion t
        INNER JOIN producto p ON t.producto_id = p.id
        WHERE t.fecha BETWEEN ? AND ?
          AND t.estatus_id = 2
          AND t.status_id = 101
          AND t.destino_id = 4
          AND t.deleted_at IS NULL

        UNION ALL

        -- Sub-bloque 4.2: Salidas (cortes, subproductos y mermas de despresado)
        SELECT
            t.fecha AS fecha,
            p.codigo AS producto_codigo,
            p.nombre AS producto_nombre,
            t.neto AS kilos,
            t.piezas,
            CASE
                WHEN p.tipo_uso_id = 85 THEN 'DESPRESADO - SUBPRODUCTOS / MERMA INDUSTRIAL'
                WHEN p.codigo IN ('260240', '260242') THEN 'DESPRESADO - REVISAR (Códigos No Usar)'
                ELSE 'DESPRESADO - SALIDAS (Cortes Comerciales)'
            END AS clasificacion
        FROM transaccion t
        INNER JOIN producto p ON t.producto_id = p.id
        WHERE t.fecha BETWEEN ? AND ?
          AND t.estatus_id = 6
          AND t.status_id = 101
          AND t.procedencia_id = 4
          AND t.deleted_at IS NULL
    ) u
    GROUP BY fecha, clasificacion, producto_codigo, producto_nombre
) AS reporte_maestro
WHERE unidades > 0 OR kg > 0
ORDER BY fecha ASC, categoria ASC, codigo ASC, referencia ASC
`;

/** Número de pares fecha_desde/fecha_hasta que espera la consulta de detalle. */
export const DETALLE_PRODUCCION_DATE_PARAM_PAIRS = 5;
