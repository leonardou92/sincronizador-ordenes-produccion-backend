import dotenv from "dotenv";
import { isLdapConfigured } from "../src/config/ldapEnv";
import { fetchAllLdapUsers } from "../src/config/ldapClient";
import { getAttr, normalizeLdapEntry } from "../src/helpers/ldap.helper";

import dotenv from "dotenv";

dotenv.config({ override: true });

async function main(): Promise<void> {
  if (!isLdapConfigured()) {
    throw new Error("Configuración LDAP incompleta en .env");
  }

  const entries = await fetchAllLdapUsers();
  const sample = entries.slice(0, 5).map((entry) => {
    const attrs = normalizeLdapEntry(entry);
    return {
      username: getAttr(attrs, "sAMAccountName", "samaccountname"),
      email: getAttr(attrs, "mail"),
      dn: getAttr(attrs, "distinguishedName", "distinguishedname"),
    };
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        totalEntries: entries.length,
        sample,
      },
      null,
      2
    )
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
