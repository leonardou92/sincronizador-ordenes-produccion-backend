import type { SearchEntry } from "ldapjs";

export type LdapAttributes = Record<string, string | string[]>;

export function normalizeLdapEntry(entry: SearchEntry): LdapAttributes {
  const attrs: LdapAttributes = {};

  for (const attr of entry.attributes) {
    const values = attr.values.map((value: Buffer | string) => String(value));
    attrs[attr.type] = values.length === 1 ? values[0] : values;
  }

  return attrs;
}

export function getAttr(attrs: LdapAttributes, ...names: string[]): string | null {
  const entries = Object.entries(attrs);

  for (const name of names) {
    const found = entries.find(([key]) => key.toLowerCase() === name.toLowerCase());
    if (!found) {
      continue;
    }

    const value = found[1];
    if (Array.isArray(value)) {
      const first = value.find((item) => item.trim() !== "");
      if (first) {
        return first.trim();
      }
      continue;
    }

    if (value.trim() !== "") {
      return value.trim();
    }
  }

  return null;
}

export function buildAdEmail(attrs: LdapAttributes, loginUpnSuffix: string): string | null {
  const mail = getAttr(attrs, "mail", "Mail");
  if (mail) {
    return mail.toLowerCase();
  }

  const username = getAttr(attrs, "sAMAccountName", "samaccountname");
  if (username) {
    return `${username.toLowerCase()}@${loginUpnSuffix}`;
  }

  return null;
}

export function escapeLdapFilter(value: string): string {
  return value.replace(/[\0\\()*]/g, (char) => {
    switch (char) {
      case "\0":
        return "\\00";
      case "*":
        return "\\2a";
      case "(":
        return "\\28";
      case ")":
        return "\\29";
      case "\\":
        return "\\5c";
      default:
        return char;
    }
  });
}
