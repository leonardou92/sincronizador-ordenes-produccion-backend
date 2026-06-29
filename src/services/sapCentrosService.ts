import { isSybaseConfigured, querySybase } from "../db/sybaseDb";
import { SAP_CENTROS_QUERY } from "../sql/sapCentrosQuery";
import type { SapCentro } from "../types/sap";

export class SapCentrosError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SapCentrosError";
  }
}

function mapCentroRow(row: Record<string, unknown>): SapCentro {
  const entries = Object.entries(row);
  const get = (...keys: string[]): string => {
    for (const key of keys) {
      const found = entries.find(([k]) => k.toLowerCase() === key.toLowerCase());
      if (found) {
        return String(found[1] ?? "").trim();
      }
    }
    return "";
  };

  return {
    werks: get("WERKS", "werks"),
    name1: get("NAME1", "name1"),
  };
}

export async function listSapCentros(): Promise<SapCentro[]> {
  if (!isSybaseConfigured()) {
    throw new SapCentrosError(
      "SAP Sybase no configurado. Defina SYBASE_SERVER, SYBASE_UID y SYBASE_PWD."
    );
  }

  const rows = await querySybase<Record<string, unknown>>(SAP_CENTROS_QUERY);
  return rows.map(mapCentroRow);
}
