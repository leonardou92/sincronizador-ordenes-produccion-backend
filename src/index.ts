import Fastify from "fastify";
import cors from "@fastify/cors";
import { getEnv } from "./config/env";
import { disconnectPrisma } from "./db/prisma";
import { closeControlPool } from "./db/controlDb";
import { plantasRoutes } from "./routes/plantas";
import { detalleRoutes } from "./routes/detalle";
import { resumenRoutes } from "./routes/resumen";
import { sapRoutes } from "./routes/sap";
import { usersRoutes } from "./routes/users";
import { authRoutes } from "./routes/auth";
import { dashboardRoutes } from "./routes/dashboard";
import { startAdSyncCron } from "./jobs/adSyncCron";
import { startProduccionSyncCron } from "./jobs/produccionSyncCron";

async function main(): Promise<void> {
  const env = getEnv();
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true });
  await app.register(plantasRoutes);
  await app.register(resumenRoutes);
  await app.register(detalleRoutes);
  await app.register(sapRoutes);
  await app.register(usersRoutes);
  await app.register(authRoutes);
  await app.register(dashboardRoutes);

  startAdSyncCron(app.log);
  startProduccionSyncCron(app.log);

  app.get("/health", async () => ({ status: "ok", timestamp: new Date().toISOString() }));

  const shutdown = async (): Promise<void> => {
    await closeControlPool();
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
