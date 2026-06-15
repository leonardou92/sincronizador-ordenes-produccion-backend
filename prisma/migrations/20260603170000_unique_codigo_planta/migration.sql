BEGIN TRY

BEGIN TRAN;

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'UQ_tbl_config_plantas_codigo_planta'
      AND object_id = OBJECT_ID(N'dbo.tbl_config_plantas_global')
)
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX [UQ_tbl_config_plantas_codigo_planta]
    ON [dbo].[tbl_config_plantas_global]([codigo_planta]);
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
