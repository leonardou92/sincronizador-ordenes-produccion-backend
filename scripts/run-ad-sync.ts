import dotenv from "dotenv";
import { disconnectPrisma } from "../src/db/prisma";
import { syncADUsers } from "../src/services/adSyncService";

dotenv.config({ override: true });

syncADUsers()
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectPrisma();
  });
