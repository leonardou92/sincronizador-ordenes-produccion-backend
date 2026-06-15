import { Prisma } from "@prisma/client";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import {
  createPlantaSchema,
  testConnectionSchema,
  updatePlantaSchema,
} from "../schemas/planta.schema";
import { sincronizarResumenSchema } from "../schemas/sincronizar.schema";
import {
  createPlanta,
  deletePlanta,
  getPlantaById,
  listPlantas,
  PlantConnectionValidationError,
  testPlantaConnection,
  updatePlanta,
} from "../services/plantasService";
import {
  sincronizarPorPlanta,
  SincronizarDetalleError,
  SincronizarResumenError,
} from "../services/sincronizarCompletoService";

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
  );
}

function handleValidationError(reply: FastifyReply, error: unknown): void {
  if (error instanceof ZodError) {
    reply.status(400).send({
      error: "Validación fallida",
      detalles: error.flatten().fieldErrors,
    });
    return;
  }
  throw error;
}

export async function plantasRoutes(app: FastifyInstance): Promise<void> {
  app.post("/plantas/test-connection", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = testConnectionSchema.parse(request.body);
      const result = await testPlantaConnection(body);
      return reply.send(result);
    } catch (error) {
      if (error instanceof ZodError) {
        return handleValidationError(reply, error);
      }
      if (error instanceof PlantConnectionValidationError) {
        return reply.status(400).send({ error: error.message });
      }
      request.log.error(error, "Error al probar conexión de planta");
      return reply.status(500).send({ error: "No se pudo probar la conexión" });
    }
  });

  app.post("/plantas", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = createPlantaSchema.parse(request.body);
      const planta = await createPlanta(body);
      return reply.status(201).send(planta);
    } catch (error) {
      if (error instanceof ZodError) {
        return handleValidationError(reply, error);
      }
      if (error instanceof PlantConnectionValidationError) {
        const esCodigoDuplicado = error.message.includes("codigo_planta");
        return reply.status(esCodigoDuplicado ? 409 : 400).send({ error: error.message });
      }
      if (isUniqueConstraintError(error)) {
        const target = String((error as Prisma.PrismaClientKnownRequestError).meta?.target ?? "");
        if (target.includes("codigo_planta")) {
          return reply.status(409).send({
            error: "Ya existe otra conexión con ese codigo_planta",
          });
        }
        return reply.status(409).send({ error: "Ya existe una planta con ese nombre" });
      }
      request.log.error(error, "Error al crear planta");
      return reply.status(500).send({ error: "No se pudo crear la planta" });
    }
  });

  app.get("/plantas", async (_request, reply) => {
    const plantas = await listPlantas();
    return reply.send(plantas);
  });

  app.get("/plantas/:id", async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const id = Number(request.params.id);
    if (Number.isNaN(id)) {
      return reply.status(400).send({ error: "ID inválido" });
    }
    const planta = await getPlantaById(id);
    if (!planta) {
      return reply.status(404).send({ error: "Planta no encontrada" });
    }
    return reply.send(planta);
  });

  app.put("/plantas/:id", async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const id = Number(request.params.id);
    if (Number.isNaN(id)) {
      return reply.status(400).send({ error: "ID inválido" });
    }

    try {
      const body = updatePlantaSchema.parse(request.body);
      const planta = await updatePlanta(id, body);
      if (!planta) {
        return reply.status(404).send({ error: "Planta no encontrada" });
      }
      return reply.send(planta);
    } catch (error) {
      if (error instanceof ZodError) {
        return handleValidationError(reply, error);
      }
      if (error instanceof PlantConnectionValidationError) {
        const esCodigoDuplicado = error.message.includes("codigo_planta");
        return reply.status(esCodigoDuplicado ? 409 : 400).send({ error: error.message });
      }
      if (isUniqueConstraintError(error)) {
        const target = String((error as Prisma.PrismaClientKnownRequestError).meta?.target ?? "");
        if (target.includes("codigo_planta")) {
          return reply.status(409).send({
            error: "Ya existe otra conexión con ese codigo_planta",
          });
        }
        return reply.status(409).send({ error: "Ya existe una planta con ese nombre" });
      }
      request.log.error(error, "Error al actualizar planta");
      return reply.status(500).send({ error: "No se pudo actualizar la planta" });
    }
  });

  app.post(
    "/plantas/:id/sincronizar",
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const id = Number(request.params.id);
      if (Number.isNaN(id)) {
        return reply.status(400).send({ error: "ID inválido" });
      }

      try {
        const body = sincronizarResumenSchema.parse(request.body);
        const resultado = await sincronizarPorPlanta(id, body);
        return reply.send(resultado);
      } catch (error) {
        if (error instanceof ZodError) {
          return handleValidationError(reply, error);
        }
        if (error instanceof SincronizarResumenError || error instanceof SincronizarDetalleError) {
          return reply.status(400).send({ error: error.message });
        }
        request.log.error(error, "Error al sincronizar datos de producción");
        return reply.status(500).send({ error: "No se pudo sincronizar" });
      }
    }
  );

  app.delete(
    "/plantas/:id",
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const id = Number(request.params.id);
      if (Number.isNaN(id)) {
        return reply.status(400).send({ error: "ID inválido" });
      }

      try {
        const deleted = await deletePlanta(id);
        if (!deleted) {
          return reply.status(404).send({ error: "Planta no encontrada" });
        }
        return reply.status(204).send();
      } catch (error) {
        request.log.error(error, "Error al eliminar planta");
        return reply.status(500).send({ error: "No se pudo eliminar la planta" });
      }
    }
  );
}
