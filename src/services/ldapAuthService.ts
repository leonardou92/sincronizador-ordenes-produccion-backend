import {
  createAuthLdapClient,
  ldapBind,
  ldapUnbind,
} from "../config/ldapClient";
import { getLdapEnv, isLdapConfigured } from "../config/ldapEnv";
import type { Client } from "ldapjs";

function destroyClient(client: Client): void {
  client.destroy();
}

async function tryBindOnce(bindDn: string, password: string): Promise<boolean> {
  const config = getLdapEnv();
  const client = createAuthLdapClient(config);
  let authenticated = false;

  try {
    await Promise.race([
      ldapBind(client, bindDn, password),
      new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error("LDAP bind timeout")),
          config.LDAP_LOGIN_BIND_TIMEOUT_MS
        );
      }),
    ]);
    authenticated = true;
    return true;
  } catch {
    return false;
  } finally {
    if (authenticated) {
      destroyClient(client);
    } else {
      await ldapUnbind(client);
      destroyClient(client);
    }
  }
}

export type AdDbAuthInput = {
  /** username en BD (sAMAccountName en minúsculas) */
  username: string;
  /** distinguishedName guardado en tbl_users por la sync AD */
  ldapDn: string | null;
};

/**
 * Autentica contra AD usando solo datos de tbl_users (sin búsqueda LDAP ni fallbacks lentos).
 * 1 bind con ldap_dn si existe; si no, 1 bind con UPN derivado del username en BD.
 */
export async function authenticateWithAdFromDb(
  user: AdDbAuthInput,
  password: string
): Promise<boolean> {
  if (!isLdapConfigured()) {
    throw new Error("Configuración LDAP incompleta");
  }

  if (!user.username.trim() || !password) {
    return false;
  }

  const ldapDn = String(user.ldapDn ?? "").trim();
  if (ldapDn) {
    return tryBindOnce(ldapDn, password);
  }

  const config = getLdapEnv();
  const upn = `${user.username.trim()}@${config.LDAP_LOGIN_UPN_SUFFIX}`;
  return tryBindOnce(upn, password);
}
