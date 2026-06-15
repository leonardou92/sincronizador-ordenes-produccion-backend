import { fetchAllLdapUsers } from "../config/ldapClient";
import { getLdapEnv, isLdapConfigured } from "../config/ldapEnv";
import {
  persistAdSyncUsers,
  prepareAdSync,
  usersTableExists,
  type AdUserRow,
} from "../db/usersDb";
import {
  buildAdEmail,
  getAttr,
  normalizeLdapEntry,
} from "../helpers/ldap.helper";
import type { AdSyncResult } from "../types/adSync";

export class AdSyncError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdSyncError";
  }
}

export async function syncADUsers(): Promise<AdSyncResult> {
  if (!isLdapConfigured()) {
    throw new AdSyncError(
      "Configuración LDAP incompleta. Defina LDAP_URL, LDAP_BASE_DN, LDAP_BIND_DN y LDAP_BIND_PASSWORD"
    );
  }

  const config = getLdapEnv();

  if (!(await usersTableExists())) {
    throw new AdSyncError(
      "La tabla dbo.tbl_users no existe. Ejecute npm run db:migrate antes de sincronizar usuarios AD"
    );
  }

  const defaultRoleId = await prepareAdSync(
    config.LDAP_DEFAULT_ROLE_ID,
    config.LDAP_DEFAULT_ROLE_NAME
  );
  const entries = await fetchAllLdapUsers();

  let skipped = 0;
  const activeUsernames = new Set<string>();
  const users: AdUserRow[] = [];

  for (const entry of entries) {
    const attrs = normalizeLdapEntry(entry);
    const username = getAttr(attrs, "sAMAccountName", "samaccountname");
    if (!username) {
      skipped += 1;
      continue;
    }

    const normalizedUsername = username.toLowerCase();
    activeUsernames.add(normalizedUsername);

    users.push({
      username: normalizedUsername,
      email:
        buildAdEmail(attrs, config.LDAP_LOGIN_UPN_SUFFIX) ??
        `${normalizedUsername}@${config.LDAP_LOGIN_UPN_SUFFIX}`,
      first_name:
        getAttr(attrs, "givenName", "givenname", "displayName", "cn") ?? "SinNombre",
      last_name: getAttr(attrs, "sn", "SN", "surname") ?? "SinApellido",
      department: getAttr(attrs, "Department", "department"),
      cargo: getAttr(attrs, "title", "Title"),
      cedula: getAttr(attrs, "employeeID", "employeeId", "employeeid"),
      ldap_dn: getAttr(attrs, "distinguishedName", "distinguishedname", "dn"),
    });
  }

  const { created, updated, deactivated } = await persistAdSyncUsers({
    users,
    defaultRoleId,
    deactivateMissing: config.LDAP_SYNC_DEACTIVATE_MISSING,
    activeUsernames,
  });

  return {
    totalEntries: entries.length,
    processed: created + updated,
    created,
    updated,
    skipped,
    deactivated,
  };
}
