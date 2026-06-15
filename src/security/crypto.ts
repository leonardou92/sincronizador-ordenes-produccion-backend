import crypto from "crypto";
import { getEnv } from "../config/env";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Obtiene la llave maestra de 32 bytes desde ENCRYPTION_KEY (Base64).
 */
function getMasterKey(): Buffer {
  const { ENCRYPTION_KEY } = getEnv();
  const key = Buffer.from(ENCRYPTION_KEY, "base64");

  if (key.length !== KEY_LENGTH) {
    throw new Error(
      `ENCRYPTION_KEY debe decodificar a exactamente ${KEY_LENGTH} bytes (AES-256). ` +
        `Longitud actual: ${key.length}. Genere una con: npm run encrypt-password -- --generate-key`
    );
  }
  return key;
}

/**
 * Cifra una contraseña en texto plano para almacenar en tbl_config_plantas_global.
 * Formato almacenado: base64(iv + authTag + ciphertext)
 */
export function encryptPassword(plainPassword: string): string {
  if (!plainPassword) {
    throw new Error("La contraseña no puede estar vacía");
  }

  const key = getMasterKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plainPassword, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

/**
 * Descifra una contraseña almacenada. Usar solo en memoria y no registrar en logs.
 */
export function decryptPassword(encryptedPassword: string): string {
  if (!encryptedPassword) {
    throw new Error("La contraseña cifrada no puede estar vacía");
  }

  const key = getMasterKey();
  const payload = Buffer.from(encryptedPassword, "base64");

  const minLength = IV_LENGTH + AUTH_TAG_LENGTH + 1;
  if (payload.length < minLength) {
    throw new Error("Formato de contraseña cifrada inválido");
  }

  const iv = payload.subarray(0, IV_LENGTH);
  const authTag = payload.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = payload.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}

/**
 * Genera una llave maestra aleatoria en Base64 (32 bytes).
 */
export function generateMasterKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString("base64");
}
