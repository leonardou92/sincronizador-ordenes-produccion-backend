import { isJwtConfigured } from "../config/jwtEnv";
import { isLdapConfigured } from "../config/ldapEnv";
import { findActiveUserForLogin, type AuthUserRecord } from "../db/usersDb";
import { signAccessToken } from "../helpers/jwt.helper";
import { isItDepartment } from "../helpers/itDepartment.helper";
import type { LoginInput } from "../schemas/auth.schema";
import { authenticateWithAdFromDb } from "./ldapAuthService";
import type { AuthUserResponse, LoginResult } from "../types/auth";
import { AD_AUTH_SOURCE } from "../types/adSync";

export class AuthError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "AuthError";
    this.statusCode = statusCode;
  }
}

function mapUserResponse(user: AuthUserRecord): AuthUserResponse {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    department: user.department,
    cargo: user.cargo,
    cedula: user.cedula,
    authSource: user.auth_source,
    role:
      user.role_id && user.role_name
        ? {
            id: user.role_id,
            roleName: user.role_name,
            description: user.role_description,
          }
        : null,
  };
}

export async function loginWithAd(input: LoginInput): Promise<LoginResult> {
  if (!isLdapConfigured()) {
    throw new AuthError("Configuración LDAP incompleta", 500);
  }

  if (!isJwtConfigured()) {
    throw new AuthError("Configuración JWT incompleta", 500);
  }

  const loginId = input.username.trim().toLowerCase();
  if (!loginId || !input.password) {
    throw new AuthError("Usuario y contraseña son obligatorios", 400);
  }

  const user = await findActiveUserForLogin(loginId);
  if (!user) {
    throw new AuthError("Credenciales inválidas", 401);
  }

  if (user.auth_source !== AD_AUTH_SOURCE) {
    throw new AuthError(
      "Este usuario no está habilitado para login con Active Directory",
      401
    );
  }

  if (!isItDepartment(user.department)) {
    throw new AuthError("Solo usuarios del departamento IT pueden iniciar sesión", 403);
  }

  const authenticated = await authenticateWithAdFromDb(
    {
      username: user.username,
      ldapDn: user.ldap_dn,
    },
    input.password
  );

  if (!authenticated) {
    throw new AuthError("Credenciales inválidas", 401);
  }

  const token = signAccessToken({
    sub: user.id,
    username: user.username,
    email: user.email,
    roleId: user.role_id,
    roleName: user.role_name,
  });

  return {
    token,
    user: mapUserResponse(user),
  };
}

export { mapUserResponse };
