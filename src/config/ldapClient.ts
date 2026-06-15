import ldap, { type Client, type SearchEntry } from "ldapjs";
import { getLdapEnv, parseLdapAttributes, type LdapEnv } from "../config/ldapEnv";

function createClient(config: LdapEnv, forAuth = false): Client {
  return ldap.createClient({
    url: config.LDAP_URL,
    connectTimeout: forAuth
      ? config.LDAP_LOGIN_CONNECT_TIMEOUT_MS
      : 10000,
    timeout: forAuth ? config.LDAP_LOGIN_TIMEOUT_MS : 30000,
    reconnect: false,
  });
}

export function createAuthLdapClient(config: LdapEnv): Client {
  return createClient(config, true);
}

export function ldapBind(client: Client, bindDn: string, password: string): Promise<void> {
  return new Promise((resolve, reject) => {
    client.bind(bindDn, password, (error: Error | null) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

export function ldapUnbind(client: Client): Promise<void> {
  return new Promise((resolve) => {
    client.unbind(() => resolve());
  });
}

export async function withLdapClient<T>(
  fn: (client: Client, config: LdapEnv) => Promise<T>
): Promise<T> {
  const config = getLdapEnv();
  const client = createClient(config);

  try {
    await ldapBind(client, config.LDAP_BIND_DN, config.LDAP_BIND_PASSWORD);
    return await fn(client, config);
  } finally {
    await ldapUnbind(client);
  }
}

export async function fetchAllLdapUsers(): Promise<SearchEntry[]> {
  return withLdapClient(async (client, config) => {
    const attributes = parseLdapAttributes(config.LDAP_ATTRIBUTES);
    const pageSize = Math.max(config.LDAP_PAGE_SIZE, 100);

    return new Promise<SearchEntry[]>((resolve, reject) => {
      const entries: SearchEntry[] = [];

      client.search(
        config.LDAP_BASE_DN,
        {
          filter: config.LDAP_SYNC_FILTER,
          scope: "sub",
          attributes,
          paged: {
            pageSize,
            pagePause: false,
          },
        },
        (error: Error | null, response) => {
          if (error) {
            reject(error);
            return;
          }

          response.on("searchEntry", (entry: SearchEntry) => {
            entries.push(entry);
          });

          response.on("error", (searchError: Error) => {
            reject(searchError);
          });

          response.on("end", () => {
            resolve(entries);
          });
        }
      );
    });
  });
}
