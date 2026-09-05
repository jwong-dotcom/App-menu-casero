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
 */
export function createDatabase(connectionString: string): Database {
  const host = safeHost(connectionString);
  const isNeon = host.endsWith(".neon.tech");

  if (isNeon) {
    return drizzleNeon(neon(connectionString), { schema });
  }
  return drizzlePg(new Pool({ connectionString }), { schema }) as unknown as Database;
}

function safeHost(connectionString: string): string {
  try {
    return new URL(connectionString).hostname;
  } catch {
    return "";
  }
}
