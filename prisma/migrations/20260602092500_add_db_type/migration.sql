BEGIN TRY

BEGIN TRAN;

ALTER TABLE [dbo].[config_plantas_global]
ADD [db_type] NVARCHAR(20) NOT NULL
    CONSTRAINT [config_plantas_global_db_type_df] DEFAULT N'mssql';

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

