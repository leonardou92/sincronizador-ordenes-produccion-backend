import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { listDetalleProduccion } from "../db/detalleProduccionDb";
import { listarResumenQuerySchema } from "../schemas/resumen.schema";
import { sincronizarResumenSchema } from "../schemas/sincronizar.schema";
import {
  sincronizarDetallePorPlanta,
  SincronizarDetalleError,
} from "../services/sincronizarDetalleService";

export async function detalleRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    "/plantas/:id/sincronizar-detalle",
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const id = Number(request.params.id);
      if (Number.isNaN(id)) {
        return reply.status(400).send({ error: "ID inválido" });
      }

      try {
        const body = sincronizarResumenSchema.parse(request.body);
        const resultado = await sincronizarDetallePorPlanta(id, body);
        return reply.send(resultado);
      } catch (error) {
        if (error instanceof ZodError) {
          return reply.status(400).send({
            error: "Validación fallida",
            detalles: error.flatten().fieldErrors,
          });
        }
        if (error instanceof SincronizarDetalleError) {
          return reply.status(400).send({ error: error.message });
        }
        request.log.error(error, "Error al sincronizar detalle de producción");
        return reply.status(500).send({ error: "No se pudo sincronizar el detalle" });
      }
    }
  );

  app.get("/detalle", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = listarResumenQuerySchema.parse(request.query);
      const filas = await listDetalleProduccion(
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
      request.log.error(error, "Error al listar detalle");
      return reply.status(500).send({ error: "No se pudo consultar el detalle" });
    }
  });
}
