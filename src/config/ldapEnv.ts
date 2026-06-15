import { z } from "zod";

const optionalString = z.string().optional();

const ldapEnvSchema = z.object({
  LDAP_URL: z.string().min(1),
  LDAP_BASE_DN: z.string().min(1),
  LDAP_BIND_DN: z.string().min(1),
  LDAP_BIND_PASSWORD: z.string().min(1),
  LDAP_SYNC_FILTER: z
    .string()
    .default(
      "(&(objectClass=user)(samaccountname=*)(!(userAccountControl:1.2.840.113556.1.4.803:=2)))"
    ),
  LDAP_USER_FILTER: z
    .string()
    .default(
      "(&(objectClass=user)(sAMAccountName={{username}})(!(userAccountControl:1.2.840.113556.1.4.803:=2)))"
    ),
  LDAP_ATTRIBUTES: z
    .string()
    .default(
      "cn,sAMAccountName,displayName,givenName,sn,mail,Department,Company,physicalDeliveryOfficeName,employeeID,employeeType,title,st,distinguishedName"
    ),
  LDAP_PAGE_SIZE: z.coerce.number().min(100).default(500),
  LDAP_SYNC_DEACTIVATE_MISSING: z
    .string()
    .optional()
    .transform((v) => v !== "false"),
  LDAP_DEFAULT_ROLE_ID: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() !== "" ? Number(v) : undefined))
    .refine((v) => v === undefined || Number.isInteger(v), {
      message: "LDAP_DEFAULT_ROLE_ID debe ser un entero",
    }),
  LDAP_DEFAULT_ROLE_NAME: z.string().default("user"),
  LDAP_DOMAIN_NETBIOS: optionalString,
  LDAP_LOGIN_UPN_SUFFIX: z.string().default("local"),
  LDAP_LOGIN_BIND_TIMEOUT_MS: z.coerce.number().default(3000),
  LDAP_LOGIN_CONNECT_TIMEOUT_MS: z.coerce.number().default(2000),
  LDAP_LOGIN_TIMEOUT_MS: z.coerce.number().default(5000),
  LDAP_LOGIN_TRY_NETBIOS: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  LDAP_LOGIN_SEARCH_FALLBACK: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  LDAP_SYNC_CRON_ENABLED: z
    .string()
    .optional()
    .transform((v) => v !== "false"),
  LDAP_SYNC_CRON: z.string().default("0 2 * * *"),
  LDAP_SYNC_CRON_TIMEZONE: z.string().optional(),
});

export type LdapEnv = z.infer<typeof ldapEnvSchema>;

let cachedLdapEnv: LdapEnv | null = null;

export function getLdapEnv(): LdapEnv {
  if (cachedLdapEnv) {
    return cachedLdapEnv;
  }

  const parsed = ldapEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`Configuración LDAP incompleta (${details})`);
  }
  cachedLdapEnv = parsed.data;
  return cachedLdapEnv;
}

export function isLdapConfigured(): boolean {
  return Boolean(
    process.env.LDAP_URL &&
      process.env.LDAP_BASE_DN &&
      process.env.LDAP_BIND_DN &&
      process.env.LDAP_BIND_PASSWORD
  );
}

export function parseLdapAttributes(attributes: string): string[] {
  return attributes
    .split(",")
    .map((attr) => attr.trim())
    .filter(Boolean);
}
