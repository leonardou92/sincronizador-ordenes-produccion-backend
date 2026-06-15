import dotenv from "dotenv";
import { execSync } from "child_process";
import path from "path";

dotenv.config({ override: true });

const root = path.resolve(__dirname, "..", "java");
const pwd = process.env.SYBASE_PWD ?? "";
const host = process.env.SYBASE_SERVER ?? "";
const port = process.env.SYBASE_PORT ?? "4901";

console.log("Password length from .env:", pwd.length);

execSync(
  `java -cp "lib/jconn4.jar;." DbeaverConnectTest ${host} ${port} "${pwd.replace(/"/g, '\\"')}"`,
  { cwd: root, stdio: "inherit" }
);
