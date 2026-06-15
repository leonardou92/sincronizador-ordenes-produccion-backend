import sql, { type ConnectionPool } from "mssql";
import { buildSqlConfig, getControlPool } from "./controlDb";
import { AD_AUTH_SOURCE, AD_PASSWORD_HASH } from "../types/adSync";

export type AdUserRow = {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  department: string | null;
  cargo: string | null;
  cedula: string | null;
  ldap_dn: string | null;
};

export type AdUserRecord = AdUserRow & {
  id: number;
};

const DEFAULT_ROLES = [
  { role_name: "admin", description: "Administrador del sistema" },
  { role_name: "user", description: "Usuario estándar" },
  { role_name: "tablet", description: "Perfil de visor/tablet/kiosk" },
] as const;

function isTempDbPermissionError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  return error.message.includes("tempdb") || error.message.includes("916");
}

export function wrapSqlServerError(error: unknown): Error {
  if (isTempDbPermissionError(error)) {
    return new Error(
      'El usuario SQL no tiene acceso a tempdb (error 916). Pida al DBA ejecutar scripts/sql/grant-app-user-permissions.sql reemplazando app_login y app_database.'
    );
  }
  return error instanceof Error ? error : new Error(String(error));
}

async function withPool<T>(fn: (pool: ConnectionPool) => Promise<T>): Promise<T> {
  const pool = new sql.ConnectionPool(buildSqlConfig());
  await pool.connect();
  try {
    return await fn(pool);
  } catch (error) {
    throw wrapSqlServerError(error);
  } finally {
    await pool.close();
  }
}

async function ensureDefaultRolesInPool(pool: ConnectionPool): Promise<void> {
  for (const role of DEFAULT_ROLES) {
    await pool
      .request()
      .input("role_name", sql.NVarChar(50), role.role_name)
      .input("description", sql.NVarChar(255), role.description)
      .query(`
        IF NOT EXISTS (SELECT 1 FROM dbo.tbl_roles WHERE role_name = @role_name)
        BEGIN
          INSERT INTO dbo.tbl_roles (role_name, description, is_deleted)
          VALUES (@role_name, @description, 0);
        END
      `);
  }
}

export async function ensureDefaultRoles(): Promise<void> {
  await withPool(ensureDefaultRolesInPool);
}

async function resolveDefaultRoleIdInPool(
  pool: ConnectionPool,
  defaultRoleId: number | undefined,
  defaultRoleName: string
): Promise<number> {
  await ensureDefaultRolesInPool(pool);

  if (defaultRoleId !== undefined) {
    const result = await pool
      .request()
      .input("id", sql.Int, defaultRoleId)
      .query(`
        SELECT TOP 1 id
        FROM dbo.tbl_roles
        WHERE id = @id AND is_deleted = 0
      `);

    const role = result.recordset[0] as { id: number } | undefined;
    if (!role) {
      throw new Error(`Rol por defecto no encontrado (LDAP_DEFAULT_ROLE_ID=${defaultRoleId})`);
    }
    return role.id;
  }

  const result = await pool
    .request()
    .input("role_name", sql.NVarChar(50), defaultRoleName)
    .query(`
      SELECT TOP 1 id
      FROM dbo.tbl_roles
      WHERE role_name = @role_name AND is_deleted = 0
    `);

  const role = result.recordset[0] as { id: number } | undefined;
  if (!role) {
    throw new Error(`Rol por defecto no encontrado (LDAP_DEFAULT_ROLE_NAME=${defaultRoleName})`);
  }
  return role.id;
}

export async function resolveDefaultRoleId(
  defaultRoleId: number | undefined,
  defaultRoleName: string
): Promise<number> {
  return withPool((pool) => resolveDefaultRoleIdInPool(pool, defaultRoleId, defaultRoleName));
}

function bindAdUserParams(request: sql.Request, row: AdUserRow): sql.Request {
  return request
    .input("username", sql.NVarChar(128), row.username)
    .input("email", sql.NVarChar(255), row.email)
    .input("first_name", sql.NVarChar(128), row.first_name)
    .input("last_name", sql.NVarChar(128), row.last_name)
    .input("department", sql.NVarChar(191), row.department)
    .input("cargo", sql.NVarChar(255), row.cargo)
    .input("cedula", sql.NVarChar(64), row.cedula)
    .input("ldap_dn", sql.NVarChar(500), row.ldap_dn)
    .input("auth_source", sql.NVarChar(20), AD_AUTH_SOURCE)
    .input("password_hash", sql.NVarChar(255), AD_PASSWORD_HASH);
}

async function findUserByUsernameOrEmailInPool(
  pool: ConnectionPool,
  username: string,
  email: string
): Promise<AdUserRecord | null> {
  const result = await pool
    .request()
    .input("username", sql.NVarChar(128), username)
    .input("email", sql.NVarChar(255), email)
    .query(`
      SELECT TOP 1
        id,
        username,
        email,
        first_name,
        last_name,
        department,
        cargo,
        cedula,
        ldap_dn
      FROM dbo.tbl_users
      WHERE username = @username OR email = @email
    `);

  const row = result.recordset[0] as AdUserRecord | undefined;
  return row ?? null;
}

async function updateAdUserInPool(pool: ConnectionPool, id: number, row: AdUserRow): Promise<void> {
  await bindAdUserParams(pool.request().input("id", sql.Int, id), row).query(`
    UPDATE dbo.tbl_users
    SET
      username = @username,
      email = @email,
      first_name = @first_name,
      last_name = @last_name,
      department = @department,
      cargo = @cargo,
      cedula = @cedula,
      ldap_dn = @ldap_dn,
      auth_source = @auth_source,
      password_hash = @password_hash,
      active = 1,
      is_deleted = 0,
      updated_at = SYSUTCDATETIME()
    WHERE id = @id
  `);
}

async function insertAdUserInPool(
  pool: ConnectionPool,
  row: AdUserRow,
  roleId: number
): Promise<void> {
  await bindAdUserParams(pool.request().input("role_id", sql.Int, roleId), row).query(`
    INSERT INTO dbo.tbl_users (
      username,
      email,
      first_name,
      last_name,
      department,
      cargo,
      cedula,
      ldap_dn,
      auth_source,
      password_hash,
      active,
      is_deleted,
      role_id
    )
    VALUES (
      @username,
      @email,
      @first_name,
      @last_name,
      @department,
      @cargo,
      @cedula,
      @ldap_dn,
      @auth_source,
      @password_hash,
      1,
      0,
      @role_id
    )
  `);
}

export type AdSyncPersistInput = {
  users: AdUserRow[];
  defaultRoleId: number;
  deactivateMissing: boolean;
  activeUsernames: Set<string>;
};

export type AdSyncPersistResult = {
  created: number;
  updated: number;
  deactivated: number;
};

export async function persistAdSyncUsers(input: AdSyncPersistInput): Promise<AdSyncPersistResult> {
  return withPool(async (pool) => {
    let created = 0;
    let updated = 0;
    let deactivated = 0;

    for (const user of input.users) {
      const existing = await findUserByUsernameOrEmailInPool(pool, user.username, user.email);

      if (existing) {
        await updateAdUserInPool(pool, existing.id, user);
        updated += 1;
        continue;
      }

      await insertAdUserInPool(pool, user, input.defaultRoleId);
      created += 1;
    }

    if (input.deactivateMissing) {
      const result = await pool.request().query(`
        SELECT id, username
        FROM dbo.tbl_users
        WHERE auth_source = N'ad' AND active = 1 AND is_deleted = 0
      `);

      for (const row of result.recordset as Array<{ id: number; username: string }>) {
        if (!input.activeUsernames.has(row.username.toLowerCase())) {
          await pool.request().input("id", sql.Int, row.id).query(`
            UPDATE dbo.tbl_users
            SET active = 0, updated_at = SYSUTCDATETIME()
            WHERE id = @id
          `);
          deactivated += 1;
        }
      }
    }

    return { created, updated, deactivated };
  });
}

export async function usersTableExists(): Promise<boolean> {
  return withPool(async (pool) => {
    const result = await pool.request().query(`
      SELECT 1 AS ok
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'tbl_users'
    `);
    return result.recordset.length > 0;
  });
}

export async function prepareAdSync(defaultRoleId: number | undefined, defaultRoleName: string): Promise<number> {
  return withPool((pool) => resolveDefaultRoleIdInPool(pool, defaultRoleId, defaultRoleName));
}

export type AuthUserRecord = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  department: string | null;
  cargo: string | null;
  cedula: string | null;
  ldap_dn: string | null;
  auth_source: string;
  role_id: number | null;
  role_name: string | null;
  role_description: string | null;
};

function mapAuthUserRow(row: Record<string, unknown>): AuthUserRecord {
  return {
    id: Number(row.id),
    username: String(row.username),
    email: String(row.email),
    first_name: String(row.first_name),
    last_name: String(row.last_name),
    department: row.department ? String(row.department) : null,
    cargo: row.cargo ? String(row.cargo) : null,
    cedula: row.cedula ? String(row.cedula) : null,
    ldap_dn: row.ldap_dn ? String(row.ldap_dn) : null,
    auth_source: String(row.auth_source),
    role_id: row.role_id === null || row.role_id === undefined ? null : Number(row.role_id),
    role_name: row.role_name ? String(row.role_name) : null,
    role_description: row.role_description ? String(row.role_description) : null,
  };
}

const AUTH_USER_SELECT = `
  SELECT
    u.id,
    u.username,
    u.email,
    u.first_name,
    u.last_name,
    u.department,
    u.cargo,
    u.cedula,
    u.ldap_dn,
    u.auth_source,
    u.role_id,
    r.role_name,
    r.description AS role_description
  FROM dbo.tbl_users u
  LEFT JOIN dbo.tbl_roles r ON r.id = u.role_id AND r.is_deleted = 0
`;

export async function findActiveUserForLogin(loginId: string): Promise<AuthUserRecord | null> {
  const pool = await getControlPool();
  const result = await pool
    .request()
    .input("login_id", sql.NVarChar(255), loginId)
    .query(`
      ${AUTH_USER_SELECT}
      WHERE u.is_deleted = 0
        AND u.active = 1
        AND (u.username = @login_id OR u.email = @login_id)
    `);

  const row = result.recordset[0] as Record<string, unknown> | undefined;
  return row ? mapAuthUserRow(row) : null;
}

export async function findActiveUserById(userId: number): Promise<AuthUserRecord | null> {
  const pool = await getControlPool();
  const result = await pool
    .request()
    .input("id", sql.Int, userId)
    .query(`
      ${AUTH_USER_SELECT}
      WHERE u.id = @id
        AND u.is_deleted = 0
        AND u.active = 1
    `);

  const row = result.recordset[0] as Record<string, unknown> | undefined;
  return row ? mapAuthUserRow(row) : null;
}
