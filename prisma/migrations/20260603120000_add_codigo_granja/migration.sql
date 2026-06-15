BEGIN TRY

BEGIN TRAN;

ALTER TABLE [dbo].[config_plantas_global]
ADD [codigo_granja] NVARCHAR(50) NOT NULL
    CONSTRAINT [config_plantas_global_codigo_granja_df] DEFAULT N'';

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
