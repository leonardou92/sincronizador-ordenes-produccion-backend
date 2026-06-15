import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { sincronizarSapInsumosSchema } from "../schemas/sap.schema";
import {
  sincronizarSapInsumosProceso,
  SincronizarSapInsumosError,
} from "../services/sincronizarSapInsumosService";

export async function sapRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    "/sap/sincronizar-insumos-proceso",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = sincronizarSapInsumosSchema.parse(request.body);
        const resultado = await sincronizarSapInsumosProceso(body);
        return reply.send(resultado);
      } catch (error) {
        if (error instanceof ZodError) {
          return reply.status(400).send({
            error: "Validación fallida",
            detalles: error.flatten().fieldErrors,
          });
        }
        if (error instanceof SincronizarSapInsumosError) {
          return reply.status(400).send({ error: error.message });
        }
        request.log.error(error, "Error al sincronizar insumos SAP");
        return reply.status(500).send({ error: "No se pudo sincronizar insumos SAP" });
      }
    }
  );
}
