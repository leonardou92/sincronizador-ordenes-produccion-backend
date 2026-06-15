-- DEPRECADO: usar Prisma → npm run db:migrate
IF NOT EXISTS (
    SELECT 1 FROM sys.tables WHERE name = 'tbl_ordenes_produccion_detalle' AND schema_id = SCHEMA_ID('dbo')
)
BEGIN
    CREATE TABLE dbo.tbl_ordenes_produccion_detalle (
        id                   BIGINT IDENTITY(1,1) NOT NULL,
        codigo_planta        NVARCHAR(50) NOT NULL,
        fecha_reporte        DATE NOT NULL,
        codigo               NVARCHAR(50) NOT NULL,
        referencia           NVARCHAR(200) NOT NULL,
        unidades             DECIMAL(18,4) NOT NULL CONSTRAINT DF_detalle_unidades DEFAULT (0),
        promedio             DECIMAL(10,2) NOT NULL CONSTRAINT DF_detalle_promedio DEFAULT (0),
        kg                   DECIMAL(18,4) NOT NULL CONSTRAINT DF_detalle_kg DEFAULT (0),
        categoria            NVARCHAR(50) NOT NULL,
        fecha_sincronizacion DATETIME2 NOT NULL CONSTRAINT DF_detalle_fecha_sync DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_tbl_ordenes_produccion_detalle PRIMARY KEY CLUSTERED (id),
        CONSTRAINT UQ_detalle_prod_planta_fecha_ref_cat UNIQUE (
            codigo_planta, fecha_reporte, codigo, referencia, categoria
        )
    );

    CREATE INDEX IX_detalle_prod_fecha ON dbo.tbl_ordenes_produccion_detalle (fecha_reporte);
    CREATE INDEX IX_detalle_prod_codigo_planta ON dbo.tbl_ordenes_produccion_detalle (codigo_planta);
END
GO
