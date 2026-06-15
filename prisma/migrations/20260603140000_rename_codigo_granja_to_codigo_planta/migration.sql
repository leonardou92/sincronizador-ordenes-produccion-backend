BEGIN TRY

BEGIN TRAN;

EXEC sp_rename N'dbo.config_plantas_global.codigo_granja', N'codigo_planta', N'COLUMN';

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
