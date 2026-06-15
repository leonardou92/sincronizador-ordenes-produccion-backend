-- Permisos mínimos para el login de la aplicación (ejecutar como sysadmin o DBA).
-- Reemplace [app_login] y [app_database] por los valores de DB_USER y DB_NAME.

USE [master];
GO

USE [tempdb];
GO
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'app_login')
BEGIN
    CREATE USER [app_login] FOR LOGIN [app_login];
END;
GO
ALTER ROLE db_datareader ADD MEMBER [app_login];
ALTER ROLE db_datawriter ADD MEMBER [app_login];
GO

USE [app_database];
GO
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'app_login')
BEGIN
    CREATE USER [app_login] FOR LOGIN [app_login];
END;
GO
ALTER ROLE db_datareader ADD MEMBER [app_login];
ALTER ROLE db_datawriter ADD MEMBER [app_login];
GO
