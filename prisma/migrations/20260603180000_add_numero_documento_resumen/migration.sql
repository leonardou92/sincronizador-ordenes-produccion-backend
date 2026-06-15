BEGIN TRY

BEGIN TRAN;

ALTER TABLE [dbo].[tbl_resumen_ordenes_produccion]
ADD [numero_documento] NVARCHAR(100) NOT NULL
    CONSTRAINT [tbl_resumen_ordenes_produccion_numero_documento_df] DEFAULT N'Sin Documento';

IF EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'UQ_resumen_op_planta_fecha_granja'
      AND object_id = OBJECT_ID(N'dbo.tbl_resumen_ordenes_produccion')
)
BEGIN
    ALTER TABLE [dbo].[tbl_resumen_ordenes_produccion]
    DROP CONSTRAINT [UQ_resumen_op_planta_fecha_granja];
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'UQ_resumen_op_planta_fecha_granja_doc'
      AND object_id = OBJECT_ID(N'dbo.tbl_resumen_ordenes_produccion')
)
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX [UQ_resumen_op_planta_fecha_granja_doc]
    ON [dbo].[tbl_resumen_ordenes_produccion]([codigo_planta], [fecha_reporte], [codigo_granja], [numero_documento]);
END;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
