BEGIN TRY

BEGIN TRAN;

IF OBJECT_ID(N'dbo.tbl_resumen_ordenes_produccion', N'U') IS NOT NULL
    EXEC sp_rename N'dbo.tbl_resumen_ordenes_produccion', N'tbl_ordenes_produccion_resumen';

IF OBJECT_ID(N'dbo.tbl_detalle_produccion', N'U') IS NOT NULL
    EXEC sp_rename N'dbo.tbl_detalle_produccion', N'tbl_ordenes_produccion_detalle';

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
