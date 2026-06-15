BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[config_plantas_global] (
    [id] INT NOT NULL IDENTITY(1,1),
    [nombre_planta] NVARCHAR(100) NOT NULL,
    [db_type] NVARCHAR(20) NOT NULL CONSTRAINT [config_plantas_global_db_type_df] DEFAULT N'mssql',
    [host] NVARCHAR(255) NOT NULL,
    [puerto] INT NOT NULL CONSTRAINT [config_plantas_global_puerto_df] DEFAULT 1433,
    [db_name] NVARCHAR(128) NOT NULL,
    [usuario] NVARCHAR(128) NOT NULL,
    [contrasena_encriptada] NVARCHAR(512) NOT NULL,
    [activo] BIT NOT NULL CONSTRAINT [config_plantas_global_activo_df] DEFAULT 1,
    [fecha_creacion] DATETIME2 NOT NULL CONSTRAINT [config_plantas_global_fecha_creacion_df] DEFAULT CURRENT_TIMESTAMP,
    [fecha_actualizacion] DATETIME2 NOT NULL,
    CONSTRAINT [config_plantas_global_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [config_plantas_global_nombre_planta_key] UNIQUE NONCLUSTERED ([nombre_planta])
);

-- CreateTable
CREATE TABLE [dbo].[produccion_consolidada] (
    [id] BIGINT NOT NULL IDENTITY(1,1),
    [origen_planta] NVARCHAR(100) NOT NULL,
    [orden_produccion] NVARCHAR(50) NOT NULL,
    [material] NVARCHAR(50) NOT NULL,
    [cantidad_global] DECIMAL(18,4),
    [cantidad_sap] DECIMAL(18,4),
    [unidad] NVARCHAR(10),
    [fecha_produccion] DATE,
    [centro_sap] NVARCHAR(20),
    [estado_cruce] NVARCHAR(30),
    [fecha_consolidacion] DATETIME2 NOT NULL CONSTRAINT [produccion_consolidada_fecha_consolidacion_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [produccion_consolidada_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_config_plantas_activo] ON [dbo].[config_plantas_global]([activo]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
