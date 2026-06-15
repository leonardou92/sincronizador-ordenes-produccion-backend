import { copyFileSync, existsSync, mkdirSync } from "fs";
import { execSync } from "child_process";
import os from "os";
import path from "path";

const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "java");
const libDir = path.join(outDir, "lib");
const targetJconn = path.join(libDir, "jconn4.jar");
const dbeaverJconn = path.join(
  os.homedir(),
  "AppData/Roaming/DBeaverData/drivers/drivers/sybase/jconnect/jconn4.jar"
);

function run(cmd: string, cwd?: string): void {
  execSync(cmd, { stdio: "inherit", cwd });
}

mkdirSync(libDir, { recursive: true });

if (existsSync(dbeaverJconn)) {
  copyFileSync(dbeaverJconn, targetJconn);
  console.log("jconn4.jar copiado desde DBeaver.");
} else if (existsSync(targetJconn)) {
  console.log("Usando jconn4.jar existente en java/lib.");
} else {
  console.error(
    "No se encontró jconn4.jar. Copie el de DBeaver a java/lib/jconn4.jar"
  );
  process.exit(1);
}

const cp =
  process.platform === "win32"
    ? `${targetJconn};${outDir}`
    : `${targetJconn}:${outDir}`;

run(`javac -cp "${cp}" SybaseQueryCli.java DbeaverConnectTest.java`, outDir);
console.log("Cliente JDBC Sybase compilado (modo DBeaver).");
