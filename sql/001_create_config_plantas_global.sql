-- DEPRECADO: usar Prisma → npm run db:migrate
-- Tabla de metadatos para conexiones dinámicas a bases Global por planta
IF NOT EXISTS (
    SELECT 1 FROM sys.tables WHERE name = 'tbl_config_plantas_global' AND schema_id = SCHEMA_ID('dbo')
)
BEGIN
    CREATE TABLE dbo.tbl_config_plantas_global (
        id                  INT IDENTITY(1,1) NOT NULL,
        nombre_planta       NVARCHAR(100) NOT NULL,
        codigo_planta       NVARCHAR(50) NOT NULL,
        db_type             NVARCHAR(20) NOT NULL CONSTRAINT DF_config_plantas_db_type DEFAULT (N'mssql'),
        host                NVARCHAR(255) NOT NULL,
        puerto              INT NOT NULL CONSTRAINT DF_config_plantas_puerto DEFAULT (1433),
        db_name             NVARCHAR(128) NOT NULL,
        usuario             NVARCHAR(128) NOT NULL,
        contrasena_encriptada NVARCHAR(512) NOT NULL,
        activo              BIT NOT NULL CONSTRAINT DF_config_plantas_activo DEFAULT (1),
        fecha_creacion      DATETIME2 NOT NULL CONSTRAINT DF_config_plantas_fecha_creacion DEFAULT (SYSUTCDATETIME()),
        fecha_actualizacion DATETIME2 NOT NULL CONSTRAINT DF_config_plantas_fecha_actualizacion DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_tbl_config_plantas_global PRIMARY KEY CLUSTERED (id),
        CONSTRAINT UQ_tbl_config_plantas_nombre UNIQUE (nombre_planta),
        CONSTRAINT UQ_tbl_config_plantas_codigo_planta UNIQUE (codigo_planta)
    );

    CREATE INDEX IX_config_plantas_activo ON dbo.tbl_config_plantas_global (activo);
END
GO

-- Tabla de ejemplo en cada planta Global (ejecutar en cada BD de planta si no existe)
/*
CREATE TABLE dbo.produccion_global (
    id                  INT IDENTITY(1,1) PRIMARY KEY,
    orden_produccion    NVARCHAR(50) NOT NULL,
    material            NVARCHAR(50) NOT NULL,
    cantidad            DECIMAL(18,4) NOT NULL,
    unidad              NVARCHAR(10) NOT NULL,
    fecha_produccion    DATE NOT NULL,
    centro              NVARCHAR(20) NULL
);
*/
