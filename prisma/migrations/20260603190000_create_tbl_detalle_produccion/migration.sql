BEGIN TRY

BEGIN TRAN;

CREATE TABLE [dbo].[tbl_detalle_produccion] (
    [id] BIGINT NOT NULL IDENTITY(1,1),
    [codigo_planta] NVARCHAR(50) NOT NULL,
    [fecha_reporte] DATE NOT NULL,
    [codigo] NVARCHAR(50) NOT NULL,
    [referencia] NVARCHAR(200) NOT NULL,
    [unidades] DECIMAL(18,4) NOT NULL CONSTRAINT [tbl_detalle_produccion_unidades_df] DEFAULT 0,
    [promedio] DECIMAL(10,2) NOT NULL CONSTRAINT [tbl_detalle_produccion_promedio_df] DEFAULT 0,
    [kg] DECIMAL(18,4) NOT NULL CONSTRAINT [tbl_detalle_produccion_kg_df] DEFAULT 0,
    [categoria] NVARCHAR(50) NOT NULL,
    [fecha_sincronizacion] DATETIME2 NOT NULL CONSTRAINT [tbl_detalle_produccion_fecha_sync_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [tbl_detalle_produccion_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [UQ_detalle_prod_planta_fecha_ref_cat] UNIQUE NONCLUSTERED (
        [codigo_planta],
        [fecha_reporte],
        [codigo],
        [referencia],
        [categoria]
    )
);

CREATE NONCLUSTERED INDEX [IX_detalle_prod_fecha] ON [dbo].[tbl_detalle_produccion]([fecha_reporte]);
CREATE NONCLUSTERED INDEX [IX_detalle_prod_codigo_planta] ON [dbo].[tbl_detalle_produccion]([codigo_planta]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
