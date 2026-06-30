import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import {
  getCategoriasDistribucion,
  getCategoriasSerie,
  getDashboardKpis,
  getEstadoSync,
  getGranjasRanking,
  getInsumosSapDiario,
  getInsumosSapPorCategoria,
  getProduccionDiaria,
  getTopProductos,
} from "../db/dashboardDb";
import { dashboardQuerySchema, dashboardTopQuerySchema } from "../schemas/dashboard.schema";
import type { DashboardMeta } from "../types/dashboard";
import { z } from "zod";

function buildMeta(
  codigoPlanta: string,
  fechaDesde: string,
  fechaHasta: string
): DashboardMeta {
  return {
    codigo_planta: codigoPlanta,
    fecha_desde: fechaDesde,
    fecha_hasta: fechaHasta,
    generado_en: new Date().toISOString(),
  };
}

function handleValidationError(error: unknown, reply: FastifyReply): boolean {
  if (error instanceof ZodError) {
    reply.status(400).send({
      error: "Validación fallida",
      detalles: error.flatten().fieldErrors,
    });
    return true;
  }
  return false;
}

const estadoSyncQuerySchema = z.object({
  codigo_planta: z.string().min(1).max(50).optional(),
});

export async function dashboardRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/dashboard/kpis",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const query = dashboardQuerySchema.parse(request.query);
        const kpis = await getDashboardKpis(
          query.codigo_planta,
          query.fecha_desde,
          query.fecha_hasta
        );

        return reply.send({
          meta: buildMeta(query.codigo_planta, query.fecha_desde, query.fecha_hasta),
          kpis,
        });
      } catch (error) {
        if (handleValidationError(error, reply)) return;
        request.log.error(error, "Error al obtener KPIs del dashboard");
        return reply.status(500).send({ error: "No se pudieron obtener los KPIs" });
      }
    }
  );

  app.get(
    "/dashboard/produccion-diaria",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const query = dashboardQuerySchema.parse(request.query);
        const serie = await getProduccionDiaria(
          query.codigo_planta,
          query.fecha_desde,
          query.fecha_hasta
        );

        return reply.send({
          meta: buildMeta(query.codigo_planta, query.fecha_desde, query.fecha_hasta),
          serie,
        });
      } catch (error) {
        if (handleValidationError(error, reply)) return;
        request.log.error(error, "Error al obtener producción diaria");
        return reply.status(500).send({ error: "No se pudo obtener la producción diaria" });
      }
    }
  );

  app.get(
    "/dashboard/granjas",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const query = dashboardQuerySchema.parse(request.query);
        const granjas = await getGranjasRanking(
          query.codigo_planta,
          query.fecha_desde,
          query.fecha_hasta
        );

        return reply.send({
          meta: buildMeta(query.codigo_planta, query.fecha_desde, query.fecha_hasta),
          granjas,
        });
      } catch (error) {
        if (handleValidationError(error, reply)) return;
        request.log.error(error, "Error al obtener ranking de granjas");
        return reply.status(500).send({ error: "No se pudo obtener el ranking de granjas" });
      }
    }
  );

  app.get(
    "/dashboard/categorias",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const query = dashboardQuerySchema.parse(request.query);
        const categorias = await getCategoriasDistribucion(
          query.codigo_planta,
          query.fecha_desde,
          query.fecha_hasta
        );

        return reply.send({
          meta: buildMeta(query.codigo_planta, query.fecha_desde, query.fecha_hasta),
          categorias,
        });
      } catch (error) {
        if (handleValidationError(error, reply)) return;
        request.log.error(error, "Error al obtener distribución por categoría");
        return reply.status(500).send({ error: "No se pudo obtener la distribución por categoría" });
      }
    }
  );

  app.get(
    "/dashboard/categorias-serie",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const query = dashboardQuerySchema.parse(request.query);
        const serie = await getCategoriasSerie(
          query.codigo_planta,
          query.fecha_desde,
          query.fecha_hasta
        );

        return reply.send({
          meta: buildMeta(query.codigo_planta, query.fecha_desde, query.fecha_hasta),
          serie,
        });
      } catch (error) {
        if (handleValidationError(error, reply)) return;
        request.log.error(error, "Error al obtener serie por categoría");
        return reply.status(500).send({ error: "No se pudo obtener la serie por categoría" });
      }
    }
  );

  app.get(
    "/dashboard/top-productos",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const query = dashboardTopQuerySchema.parse(request.query);
        const productos = await getTopProductos(
          query.codigo_planta,
          query.fecha_desde,
          query.fecha_hasta,
          query.limite
        );

        return reply.send({
          meta: {
            ...buildMeta(query.codigo_planta, query.fecha_desde, query.fecha_hasta),
            limite: query.limite,
          },
          productos,
        });
      } catch (error) {
        if (handleValidationError(error, reply)) return;
        request.log.error(error, "Error al obtener top productos");
        return reply.status(500).send({ error: "No se pudo obtener el top de productos" });
      }
    }
  );

  app.get(
    "/dashboard/insumos-sap",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const query = dashboardQuerySchema.parse(request.query);
        const [serie, por_categoria] = await Promise.all([
          getInsumosSapDiario(query.codigo_planta, query.fecha_desde, query.fecha_hasta),
          getInsumosSapPorCategoria(query.codigo_planta, query.fecha_desde, query.fecha_hasta),
        ]);

        return reply.send({
          meta: buildMeta(query.codigo_planta, query.fecha_desde, query.fecha_hasta),
          serie,
          por_categoria,
        });
      } catch (error) {
        if (handleValidationError(error, reply)) return;
        request.log.error(error, "Error al obtener insumos SAP");
        return reply.status(500).send({ error: "No se pudieron obtener los insumos SAP" });
      }
    }
  );

  app.get(
    "/dashboard/estado-sync",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const query = estadoSyncQuerySchema.parse(request.query);
        const plantas = await getEstadoSync(query.codigo_planta);

        return reply.send({
          meta: { generado_en: new Date().toISOString() },
          plantas,
        });
      } catch (error) {
        if (handleValidationError(error, reply)) return;
        request.log.error(error, "Error al obtener estado de sincronización");
        return reply.status(500).send({ error: "No se pudo obtener el estado de sincronización" });
      }
    }
  );
}
