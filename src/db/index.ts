import { createDatabase, type Database } from "./client";
import * as schema from "./schema";

let client: Database | null = null;

function connect(): Database {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "Falta DATABASE_URL. Copia .env.example a .env y pega la cadena de conexion de Neon.",
    );
  }
  return createDatabase(connectionString);
}

/**
 * Cliente perezoso: la conexion se crea en la primera consulta, no al importar.
 * Asi `next build` no falla en entornos donde DATABASE_URL aun no esta definida.
 */
export const db = new Proxy({} as Database, {
  get(_target, prop, receiver) {
    client ??= connect();
    return Reflect.get(client, prop, receiver);
  },
});

export { schema };
