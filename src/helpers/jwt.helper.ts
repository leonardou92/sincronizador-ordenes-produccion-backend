import jwt from "jsonwebtoken";
import { getJwtEnv } from "../config/jwtEnv";

export type AccessTokenPayload = {
  sub: number;
  username: string;
  email: string;
  roleId: number | null;
  roleName: string | null;
};

export function signAccessToken(payload: AccessTokenPayload): string {
  const config = getJwtEnv();
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const config = getJwtEnv();
  const decoded = jwt.verify(token, config.JWT_SECRET);

  if (typeof decoded !== "object" || decoded === null) {
    throw new Error("Token inválido");
  }

  const record = decoded as Record<string, unknown>;

  return {
    sub: Number(record.sub),
    username: String(record.username ?? ""),
    email: String(record.email ?? ""),
    roleId:
      record.roleId === null || record.roleId === undefined ? null : Number(record.roleId),
    roleName: record.roleName ? String(record.roleName) : null,
  };
}
