import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

/**
 * Ambos drivers exponen la misma API de consultas de Drizzle; se toma la del
 * driver de Neon como tipo canonico para no arrastrar una union por el codigo.
 */
export type Database = ReturnType<typeof drizzleNeon<typeof schema>>;

/**
 * En produccion (Neon) se usa el driver HTTP serverless, que no mantiene
 * conexiones abiertas y funciona bien en funciones edge/serverless.
 * Contra cualquier otro Postgres (por ejemplo uno local en Docker) se usa
 * node-postgres, para poder desarrollar sin depender de la nube.
 *
 * DB_DRIVER=pg fuerza node-postgres aunque el host sea de Neon. Sirve para
 * desarrollar detras de un antivirus o proxy corporativo que intercepta
 * HTTPS (error tipico: SELF_SIGNED_CERT_IN_CHAIN): ese trafico se hace por
 * fetch/HTTPS, mientras que node-postgres habla el protocolo nativo de
 * Postgres por otro puerto, que esas herramientas no suelen inspeccionar.
 */
export function createDatabase(connectionString: string): Database {
  const host = safeHost(connectionString);
  const forcePg = process.env.DB_DRIVER === "pg";
  const isNeon = !forcePg && host.endsWith(".neon.tech");

  if (isNeon) {
    console.log("[db] usando driver: neon-http (fetch sobre HTTPS)");
    return drizzleNeon(neon(connectionString), { schema });
  }
  console.log("[db] usando driver: node-postgres (protocolo nativo de Postgres)");
  return drizzlePg(new Pool({ connectionString }), { schema }) as unknown as Database;
}

function safeHost(connectionString: string): string {
  try {
    return new URL(connectionString).hostname;
  } catch {
    return "";
  }
}
