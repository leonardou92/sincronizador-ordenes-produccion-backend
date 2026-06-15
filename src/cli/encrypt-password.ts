import dotenv from "dotenv";
import { encryptPassword, generateMasterKey } from "../security/crypto";

dotenv.config();

const args = process.argv.slice(2);

if (args.includes("--generate-key")) {
  console.log("Llave maestra AES-256 (agregar a .env como ENCRYPTION_KEY):");
  console.log(generateMasterKey());
  process.exit(0);
}

const passwordIndex = args.indexOf("--password");
const plain =
  passwordIndex >= 0 ? args[passwordIndex + 1] : args.find((a) => !a.startsWith("--"));

if (!plain) {
  console.log(`
Uso:
  npm run encrypt-password -- --generate-key
  npm run encrypt-password -- --password "miPassword123"

Requiere ENCRYPTION_KEY en .env para cifrar.
`);
  process.exit(1);
}

try {
  const encrypted = encryptPassword(plain);
  console.log("Contraseña cifrada (para insert manual o pruebas):");
  console.log(encrypted);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
