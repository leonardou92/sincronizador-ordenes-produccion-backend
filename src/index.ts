import Fastify from "fastify";
import cors from "@fastify/cors";
import { getEnv } from "./config/env";
import { disconnectPrisma } from "./db/prisma";
import { plantasRoutes } from "./routes/plantas";
import { detalleRoutes } from "./routes/detalle";
import { resumenRoutes } from "./routes/resumen";

async function main(): Promise<void> {
  const env = getEnv();
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true });
  await app.register(plantasRoutes);
  await app.register(resumenRoutes);
  await app.register(detalleRoutes);

  app.get("/health", async () => ({ status: "ok", timestamp: new Date().toISOString() }));

  const shutdown = async (): Promise<void> => {
    await disconnectPrisma();
    await app.close();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  await app.listen({ host: env.API_HOST, port: env.API_PORT });
  app.log.info(`API escuchando en http://${env.API_HOST}:${env.API_PORT}`);
}

main().catch((err) => {
  console.error("Error al iniciar la API:", err);
  process.exit(1);
});
