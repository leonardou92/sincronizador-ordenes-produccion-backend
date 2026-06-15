-- DEPRECADO: usar Prisma → npm run db:migrate
-- Resumen diario sincronizado desde Global (MySQL) hacia BD de control
IF NOT EXISTS (
    SELECT 1 FROM sys.tables WHERE name = 'tbl_ordenes_produccion_resumen' AND schema_id = SCHEMA_ID('dbo')
)
BEGIN
    CREATE TABLE dbo.tbl_ordenes_produccion_resumen (
        id                   BIGINT IDENTITY(1,1) NOT NULL,
        codigo_planta        NVARCHAR(50) NOT NULL,
        fecha_reporte        DATE NOT NULL,
        codigo_granja        NVARCHAR(50) NOT NULL,
        nombre_granja        NVARCHAR(200) NOT NULL,
        numero_documento     NVARCHAR(100) NOT NULL CONSTRAINT DF_resumen_op_numero_doc DEFAULT (N'Sin Documento'),
        aves_granja          DECIMAL(18,4) NOT NULL,
        kg_granja            DECIMAL(18,4) NOT NULL,
        peso_prom_granja     DECIMAL(10,2) NULL,
        aves_produccion      DECIMAL(18,4) NOT NULL,
        kg_produccion        DECIMAL(18,4) NOT NULL,
        peso_prom_produccion DECIMAL(10,2) NULL,
        fecha_sincronizacion DATETIME2 NOT NULL CONSTRAINT DF_resumen_op_fecha_sync DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_tbl_ordenes_produccion_resumen PRIMARY KEY CLUSTERED (id),
        CONSTRAINT UQ_resumen_op_planta_fecha_granja_doc UNIQUE (codigo_planta, fecha_reporte, codigo_granja, numero_documento)
    );

    CREATE INDEX IX_resumen_op_fecha ON dbo.tbl_ordenes_produccion_resumen (fecha_reporte);
    CREATE INDEX IX_resumen_op_codigo_planta ON dbo.tbl_ordenes_produccion_resumen (codigo_planta);
END
GO
