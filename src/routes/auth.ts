import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { authenticateRequest } from "../middlewares/auth.middleware";
import { loginSchema } from "../schemas/auth.schema";
import { AuthError, loginWithAd, mapUserResponse } from "../services/authService";
import { findActiveUserById } from "../db/usersDb";

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post("/auth/login", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = loginSchema.parse(request.body);
      const result = await loginWithAd(body);
      return reply.send({ ok: true, data: result });
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({
          ok: false,
          msg: "Usuario y contraseña son obligatorios",
        });
      }
      if (error instanceof AuthError) {
        return reply.status(error.statusCode).send({ ok: false, msg: error.message });
      }
      request.log.error(error, "Error en login AD");
      return reply.status(502).send({
        ok: false,
        msg: "No se pudo validar las credenciales con Active Directory",
      });
    }
  });

  app.get(
    "/auth/me",
    { preHandler: authenticateRequest },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const authUser = request.authUser;
      if (!authUser) {
        return reply.status(401).send({ ok: false, msg: "No autenticado" });
      }

      const user = await findActiveUserById(authUser.sub);
      if (!user) {
        return reply.status(401).send({ ok: false, msg: "Usuario no encontrado o inactivo" });
      }

      return reply.send({
        ok: true,
        data: mapUserResponse(user),
      });
    }
  );
}
