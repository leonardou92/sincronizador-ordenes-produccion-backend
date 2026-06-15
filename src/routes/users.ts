import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { isLdapConfigured } from "../config/ldapEnv";
import { AdSyncError, syncADUsers } from "../services/adSyncService";

export async function usersRoutes(app: FastifyInstance): Promise<void> {
  app.post("/users/sync-ad", async (_request: FastifyRequest, reply: FastifyReply) => {
    if (!isLdapConfigured()) {
      return reply.status(500).send({
        ok: false,
        msg: "Configuración LDAP incompleta (LDAP_URL, LDAP_BASE_DN, LDAP_BIND_DN, LDAP_BIND_PASSWORD)",
      });
    }

    try {
      const data = await syncADUsers();
      return reply.send({
        ok: true,
        data: {
          ...data,
          processed: data.created + data.updated,
        },
      });
    } catch (error) {
      if (error instanceof AdSyncError) {
        return reply.status(500).send({
          ok: false,
          msg: error.message,
        });
      }

      const message =
        error instanceof Error ? error.message : "Error desconocido sincronizando Active Directory";

      return reply.status(502).send({
        ok: false,
        msg: `Error sincronizando Active Directory: ${message}`,
      });
    }
  });
}
