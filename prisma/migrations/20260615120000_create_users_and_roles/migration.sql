BEGIN TRY

BEGIN TRAN;

CREATE TABLE [dbo].[tbl_roles] (
    [id] INT NOT NULL IDENTITY(1,1),
    [role_name] NVARCHAR(50) NOT NULL,
    [description] NVARCHAR(255) NULL,
    [is_deleted] BIT NOT NULL CONSTRAINT [tbl_roles_is_deleted_df] DEFAULT 0,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [tbl_roles_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL CONSTRAINT [tbl_roles_updated_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [tbl_roles_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [tbl_roles_role_name_key] UNIQUE NONCLUSTERED ([role_name])
);

CREATE TABLE [dbo].[tbl_users] (
    [id] INT NOT NULL IDENTITY(1,1),
    [username] NVARCHAR(128) NOT NULL,
    [email] NVARCHAR(255) NOT NULL,
    [first_name] NVARCHAR(128) NOT NULL,
    [last_name] NVARCHAR(128) NOT NULL,
    [department] NVARCHAR(191) NULL,
    [cargo] NVARCHAR(255) NULL,
    [cedula] NVARCHAR(64) NULL,
    [ldap_dn] NVARCHAR(500) NULL,
    [auth_source] NVARCHAR(20) NOT NULL CONSTRAINT [tbl_users_auth_source_df] DEFAULT N'local',
    [password_hash] NVARCHAR(255) NOT NULL,
    [active] BIT NOT NULL CONSTRAINT [tbl_users_active_df] DEFAULT 1,
    [is_deleted] BIT NOT NULL CONSTRAINT [tbl_users_is_deleted_df] DEFAULT 0,
    [role_id] INT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [tbl_users_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL CONSTRAINT [tbl_users_updated_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [tbl_users_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [tbl_users_username_key] UNIQUE NONCLUSTERED ([username]),
    CONSTRAINT [tbl_users_email_key] UNIQUE NONCLUSTERED ([email]),
    CONSTRAINT [tbl_users_role_id_fkey] FOREIGN KEY ([role_id]) REFERENCES [dbo].[tbl_roles]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE NONCLUSTERED INDEX [IX_users_auth_active] ON [dbo].[tbl_users]([auth_source], [active], [is_deleted]);

INSERT INTO [dbo].[tbl_roles] ([role_name], [description], [is_deleted])
VALUES
    (N'admin', N'Administrador del sistema', 0),
    (N'user', N'Usuario estándar', 0),
    (N'tablet', N'Perfil de visor/tablet/kiosk', 0);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
