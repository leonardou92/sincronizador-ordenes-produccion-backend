BEGIN TRY

BEGIN TRAN;

CREATE TABLE [dbo].[resumen_ordenes_produccion] (
    [id] BIGINT NOT NULL IDENTITY(1,1),
    [codigo_planta] NVARCHAR(50) NOT NULL,
    [fecha_reporte] DATE NOT NULL,
    [codigo_granja] NVARCHAR(50) NOT NULL,
    [nombre_granja] NVARCHAR(200) NOT NULL,
    [aves_granja] DECIMAL(18,4) NOT NULL,
    [kg_granja] DECIMAL(18,4) NOT NULL,
    [peso_prom_granja] DECIMAL(10,2),
    [aves_produccion] DECIMAL(18,4) NOT NULL,
    [kg_produccion] DECIMAL(18,4) NOT NULL,
    [peso_prom_produccion] DECIMAL(10,2),
    [fecha_sincronizacion] DATETIME2 NOT NULL CONSTRAINT [resumen_ordenes_produccion_fecha_sincronizacion_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [resumen_ordenes_produccion_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [UQ_resumen_op_planta_fecha_granja] UNIQUE NONCLUSTERED ([codigo_planta],[fecha_reporte],[codigo_granja])
);

CREATE NONCLUSTERED INDEX [IX_resumen_op_fecha] ON [dbo].[resumen_ordenes_produccion]([fecha_reporte]);
CREATE NONCLUSTERED INDEX [IX_resumen_op_codigo_planta] ON [dbo].[resumen_ordenes_produccion]([codigo_planta]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
