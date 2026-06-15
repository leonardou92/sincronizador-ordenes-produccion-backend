BEGIN TRY

BEGIN TRAN;

IF OBJECT_ID(N'dbo.config_plantas_global', N'U') IS NOT NULL
    EXEC sp_rename N'dbo.config_plantas_global', N'tbl_config_plantas_global';

IF OBJECT_ID(N'dbo.resumen_ordenes_produccion', N'U') IS NOT NULL
    EXEC sp_rename N'dbo.resumen_ordenes_produccion', N'tbl_resumen_ordenes_produccion';

IF OBJECT_ID(N'dbo.produccion_consolidada', N'U') IS NOT NULL
    EXEC sp_rename N'dbo.produccion_consolidada', N'tbl_produccion_consolidada';

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
