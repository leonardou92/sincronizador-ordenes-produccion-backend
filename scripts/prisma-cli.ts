import { execSync } from "child_process";
import dotenv from "dotenv";
import { ensureDatabaseUrl } from "../src/config/databaseUrl";

dotenv.config();
ensureDatabaseUrl();

const args = process.argv.slice(2).join(" ");
if (!args) {
  console.error("Uso: tsx scripts/prisma-cli.ts <comando prisma>");
  process.exit(1);
}

execSync(`npx prisma ${args}`, { stdio: "inherit", env: process.env });
