import dotenv from "dotenv";
import { disconnectPrisma } from "../src/db/prisma";
import { closeControlPool } from "../src/db/controlDb";
import { sincronizarProduccionProgramada } from "../src/services/sincronizarProgramadoService";

dotenv.config({ override: true });

sincronizarProduccionProgramada()
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeControlPool();
    await disconnectPrisma();
  });
