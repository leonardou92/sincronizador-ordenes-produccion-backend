import type { FastifyReply, FastifyRequest } from "fastify";
import { verifyAccessToken, type AccessTokenPayload } from "../helpers/jwt.helper";
import { isJwtConfigured } from "../config/jwtEnv";

declare module "fastify" {
  interface FastifyRequest {
    authUser?: AccessTokenPayload;
  }
}

function extractBearerToken(request: FastifyRequest): string | null {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return null;
  }
  return header.slice("Bearer ".length).trim();
}

export async function authenticateRequest(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  if (!isJwtConfigured()) {
    reply.status(500).send({ ok: false, msg: "Configuración JWT incompleta" });
    return;
  }

  const token = extractBearerToken(request);
  if (!token) {
    reply.status(401).send({ ok: false, msg: "Token no proporcionado" });
    return;
  }

  try {
    request.authUser = verifyAccessToken(token);
  } catch {
    reply.status(401).send({ ok: false, msg: "Token inválido o expirado" });
  }
}
