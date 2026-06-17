/**
 * Resumen diario por granja y pedido desde base Global (MySQL).
 * Parámetros (×2): fecha_desde, fecha_hasta (YYYY-MM-DD).
 * Sin CTE: compatible con MySQL 5.7.
 */
export const RESUMEN_ORDENES_PRODUCCION_SQL = `
SELECT
    d.fecha_reporte AS fecha_reporte,
    COALESCE(d.codigo_granja, '') AS codigo_granja,
    d.nombre_granja AS nombre_granja,
    d.numero_documento AS numero_documento,
    d.aves_granja AS aves_granja,
    d.kg_granja AS kg_granja,
    ROUND(d.kg_granja / NULLIF(d.aves_granja, 0), 2) AS peso_prom_granja,
    ROUND((d.aves_granja / NULLIF(t.total_aves_granja_dia, 0)) * t.total_aves_produccion_dia, 0) AS aves_produccion,
    d.kg_produccion AS kg_produccion,
    ROUND(
        d.kg_produccion / NULLIF(
            ROUND((d.aves_granja / NULLIF(t.total_aves_granja_dia, 0)) * t.total_aves_produccion_dia, 0),
            0
        ),
        2
    ) AS peso_prom_produccion
FROM (
    SELECT
        t.fecha AS fecha_reporte,
        g.codigo AS codigo_granja,
        COALESCE(g.nombre, 'Sin Granja Registrada') AS nombre_granja,
        COALESCE(pe.codigo, 'Sin Documento') AS numero_documento,
        SUM(
            CASE
                WHEN t.estatus_id = 44 THEN
                    (COALESCE(CAST(t.adicional->>'$.datos_granja[0].cestas_1' AS UNSIGNED), 0) * COALESCE(CAST(t.adicional->>'$.datos_granja[0].axcestas_1' AS UNSIGNED), 0)) +
                    (COALESCE(CAST(t.adicional->>'$.datos_granja[0].cestas_2' AS UNSIGNED), 0) * COALESCE(CAST(t.adicional->>'$.datos_granja[0].axcestas_2' AS UNSIGNED), 0)) +
                    (COALESCE(CAST(t.adicional->>'$.datos_granja[0].cestas_3' AS UNSIGNED), 0) * COALESCE(CAST(t.adicional->>'$.datos_granja[0].axcestas_3' AS UNSIGNED), 0))
                ELSE 0
            END
        ) AS aves_granja,
        SUM(
            IF(
                t.estatus_id = 46,
                COALESCE(NULLIF(CAST(t.adicional->>'$.datos_granja[0].neto_granja' AS DECIMAL(10,2)), 0.0), t.neto),
                0.0
            )
        ) AS kg_granja,
        SUM(
            CASE
                WHEN t.estatus_id = 46 THEN
                    COALESCE(NULLIF(CAST(t.adicional->>'$.datos_granja[0].bruto_verifica' AS DECIMAL(10,2)), 0.0), t.neto)
                    - COALESCE(CAST(t.adicional->>'$.descartes[0].pollo_ahogado_neto' AS DECIMAL(15,2)), 0)
                    - COALESCE((
                        SELECT
                            ROUND(
                                SUM(
                                    (CAST(t_muestra.adicional->>'$.descartes[3].buche_neto' AS DECIMAL(15,2)) /
                                     NULLIF(CAST(t_muestra.adicional->>'$.descartes[3].buche_cantidad' AS DECIMAL(15,2)), 0))
                                    * (
                                       CAST(t_real.adicional->>'$.contador_aves' AS DECIMAL(15,2)) +
                                       COALESCE(CAST(t_real.adicional->>'$.descartes[0].pollo_ahogado_cantidad' AS DECIMAL(15,2)), 0)
                                      )
                                ),
                                2
                            )
                        FROM
                            transaccion t_muestra
                        INNER JOIN transaccion t_real
                            ON t_muestra.fecha = t_real.fecha
                            AND t_muestra.adicional->>'$.contador_camion' = t_real.adicional->>'$.contador_camion'
                        WHERE
                            t_real.id = t.id
                            AND t_muestra.status_id = 101
                            AND t_muestra.deleted_at IS NULL
                            AND t_muestra.fecha = t.fecha
                            AND t_muestra.adicional LIKE '%buche_neto%'
                    ), 0)
                ELSE 0
            END
        ) AS kg_produccion
    FROM transaccion t
    INNER JOIN producto p ON t.producto_id = p.id
    LEFT JOIN granja g ON COALESCE(t.granja_id, CAST(t.adicional->>'$.granja_id' AS UNSIGNED)) = g.id
    LEFT JOIN pedido pe ON t.pedido_id = pe.id
    WHERE t.fecha BETWEEN ? AND ?
      AND p.codigo = '300002'
      AND t.status_id = 101
      AND t.deleted_at IS NULL
    GROUP BY t.fecha, g.id, g.codigo, g.nombre, pe.codigo
) d
INNER JOIN (
    SELECT
        t.fecha AS fecha_reporte,
        COALESCE(SUM(
            CASE
                WHEN t.estatus_id = 44 THEN
                    (COALESCE(CAST(t.adicional->>'$.datos_granja[0].cestas_1' AS UNSIGNED), 0) * COALESCE(CAST(t.adicional->>'$.datos_granja[0].axcestas_1' AS UNSIGNED), 0)) +
                    (COALESCE(CAST(t.adicional->>'$.datos_granja[0].cestas_2' AS UNSIGNED), 0) * COALESCE(CAST(t.adicional->>'$.datos_granja[0].axcestas_2' AS UNSIGNED), 0)) +
                    (COALESCE(CAST(t.adicional->>'$.datos_granja[0].cestas_3' AS UNSIGNED), 0) * COALESCE(CAST(t.adicional->>'$.datos_granja[0].axcestas_3' AS UNSIGNED), 0))
                ELSE 0
            END
        ), 0) AS total_aves_granja_dia,
        SUM(IF(t.estatus_id = 52, t.piezas, 0)) AS total_aves_produccion_dia
    FROM transaccion t
    INNER JOIN producto p ON t.producto_id = p.id
    WHERE t.fecha BETWEEN ? AND ?
      AND t.status_id = 101
      AND t.deleted_at IS NULL
    GROUP BY t.fecha
) t ON t.fecha_reporte = d.fecha_reporte
WHERE d.aves_granja > 0 OR d.kg_granja > 0 OR d.kg_produccion > 0
ORDER BY d.fecha_reporte, d.numero_documento ASC, d.aves_granja DESC
`;

/** Número de pares fecha_desde/fecha_hasta que espera la consulta de resumen. */
export const RESUMEN_ORDENES_PRODUCCION_DATE_PARAM_PAIRS = 2;
