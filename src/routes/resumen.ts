import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { listResumenOrdenProduccion } from "../db/resumenOrdenProduccionDb";
import { listarResumenQuerySchema } from "../schemas/resumen.schema";

export async function resumenRoutes(app: FastifyInstance): Promise<void> {
  app.get("/resumen", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = listarResumenQuerySchema.parse(request.query);
      const filas = await listResumenOrdenProduccion(
        query.codigo_planta,
        query.fecha_desde,
        query.fecha_hasta
      );

      return reply.send({
        codigo_planta: query.codigo_planta,
        fecha_desde: query.fecha_desde,
        fecha_hasta: query.fecha_hasta,
        total: filas.length,
        filas,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({
          error: "Validación fallida",
          detalles: error.flatten().fieldErrors,
        });
      }
      request.log.error(error, "Error al listar resumen");
      return reply.status(500).send({ error: "No se pudo consultar el resumen" });
    }
  });
}
