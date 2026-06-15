-- DEPRECADO: usar Prisma → npm run db:migrate
-- Tabla opcional para persistir el resultado del ETL en la BD de controlIF NOT EXISTS (
    SELECT 1 FROM sys.tables WHERE name = 'tbl_produccion_consolidada' AND schema_id = SCHEMA_ID('dbo')
)
BEGIN
    CREATE TABLE dbo.tbl_produccion_consolidada (
        id                  BIGINT IDENTITY(1,1) NOT NULL,
        origen_planta       NVARCHAR(100) NOT NULL,
        orden_produccion    NVARCHAR(50) NOT NULL,
        material            NVARCHAR(50) NOT NULL,
        cantidad_global     DECIMAL(18,4) NULL,
        cantidad_sap        DECIMAL(18,4) NULL,
        unidad              NVARCHAR(10) NULL,
        fecha_produccion    DATE NULL,
        centro_sap          NVARCHAR(20) NULL,
        estado_cruce        NVARCHAR(30) NULL,
        fecha_consolidacion DATETIME2 NOT NULL CONSTRAINT DF_prod_cons_fecha DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_tbl_produccion_consolidada PRIMARY KEY CLUSTERED (id)
    );
END
GO
