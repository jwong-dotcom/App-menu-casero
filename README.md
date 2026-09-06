# Menu Casero

Web app para responder la pregunta de todos los dias: **que cocino manana**.

Arma el menu de la semana sin repetir ningun plato durante cuatro semanas, calcula
la lista de compras completa y muestra el valor nutricional de cada comida.
Disenada mobile first (navegacion inferior tipo app), con layout de escritorio.

## Que hace

- **Menu semanal automatico** para desayuno, almuerzo y cena (activables por separado).
- **Cero repeticiones en 4 semanas**: al generar una semana se descartan los platos
  usados en las 3 semanas anteriores y las 3 siguientes.
- **Lista de compras** agrupada por pasillo del supermercado, con cantidades ya
  escaladas al numero de personas de la casa, checkboxes que se guardan, y exportacion
  por texto o WhatsApp.
- **Valor nutricional** por plato y total por dia (calorias, proteina, carbohidratos,
  grasas, fibra y sodio).
- **Cuantas personas cocinas**: adultos y ninos (cada nino cuenta como media porcion).
- **Cambiar un plato** que no apetece, sin romper la regla de no repeticion.
- **Alimentos excluidos** por salud o por gusto, del catalogo o escritos a mano.
  Ningun plato que los contenga entra al menu.
- **Preferencias guardadas**: tiempo maximo de preparacion, presupuesto y tipo de
  alimentacion (vegetariano, vegano, sin gluten, sin lacteos, alto en proteina,
  bajo en calorias).

Extras que se agregaron sobre lo pedido:

- **Aviso de variedad**: en Preferencias se muestra cuantos platos sobreviven a los
  filtros y si alcanzan para 4 semanas sin repetir. Evita que el menu repita en silencio.
- **Despensa**: marca lo que ya tienes en casa para que no te lo cuente como compra.
- **Favoritos**: los platos marcados con estrella se priorizan al generar el menu.
- **Historial por semana**: puedes ir y volver entre semanas y ver menus pasados.
- **PWA instalable**: manifest e iconos listos para agregar a la pantalla de inicio.
- **Catalogo de 125 recetas peruanas** con ingredientes, pasos y nutricion.

## Stack

- Next.js 15 (App Router, Server Actions) + React 19 + TypeScript
- Tailwind CSS v4
- Neon serverless Postgres + Drizzle ORM
- Autenticacion propia: bcrypt + sesion JWT en cookie httpOnly (`jose`)
- Despliegue: Vercel

El cliente de base de datos usa el driver HTTP de Neon cuando la conexion apunta a
`*.neon.tech`, y `node-postgres` contra cualquier otro Postgres, para poder desarrollar
en local sin depender de la nube (`src/db/client.ts`).

## Puesta en marcha

### 1. Crear la base de datos en Neon

1. Entra a <https://console.neon.tech> y crea un proyecto (region mas cercana a tus
   usuarios; para Peru, `us-east-2` o `sa-east-1`).
2. En **Connection Details** copia la cadena **Pooled connection**
   (la que tiene `-pooler` en el host).

### 2. Variables de entorno

```bash
cp .env.example .env
```

Completa:

- `DATABASE_URL`: la cadena de Neon.
- `AUTH_SECRET`: secreto para firmar la cookie de sesion. Generalo con
  `openssl rand -base64 48`.

### 3. Instalar, migrar y cargar recetas

```bash
npm install
npm run db:push     # crea las tablas en Neon
npm run db:seed     # carga 117 ingredientes y 125 recetas
npm run dev         # http://localhost:3000
```

Crea tu cuenta en `/registro` y genera el menu en `/plan`.

### 4. Desplegar en Vercel

1. Sube el repo a GitHub e importalo en Vercel.
2. En **Settings → Environment Variables** agrega `DATABASE_URL` y `AUTH_SECRET`
   para Production, Preview y Development.
3. Deploy. No hace falta configuracion extra: el proyecto usa el runtime Node por
   defecto y el driver HTTP de Neon.

Opcional: en Vercel puedes conectar Neon desde **Storage → Neon**, que inyecta
`DATABASE_URL` automaticamente.

## Scripts

| Comando | Que hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de produccion |
| `npm run db:generate` | Genera migraciones SQL desde el esquema |
| `npm run db:push` | Aplica el esquema a la base de datos |
| `npm run db:seed` | Carga ingredientes y recetas (idempotente) |
| `npx tsx scripts/smoke-planner.ts` | Genera 4 semanas seguidas y verifica que ningun plato se repita |

## Como funciona la regla de las 4 semanas

`src/lib/planner.ts` recibe el catalogo ya filtrado por las preferencias del usuario
y el conjunto de recetas usadas en la ventana de +/- 3 semanas alrededor de la semana
que se esta generando. Atiende primero el tipo de comida con menos recetas disponibles
(almuerzo y cena comparten catalogo, asi que el pool mas escaso elige antes) y nunca
repite dentro de la misma semana.

Si los filtros dejan menos platos de los necesarios, el planificador completa la
semana permitiendo repetir de semanas anteriores y **avisa explicitamente** cuantos
platos tuvo que repetir. Cuatro semanas completas necesitan 28 platos por cada comida
activada, y almuerzo y cena juntos necesitan 56 platos principales distintos.

## Estructura

```
src/
  app/
    (auth)/        login y registro
    (app)/         plan, lista, recetas, receta/[slug], preferencias
    actions/       server actions (auth, plan, preferencias)
  components/      navegacion y piezas de UI
  db/
    schema.ts      esquema Drizzle
    client.ts      driver Neon HTTP o node-postgres segun la conexion
    seed.ts        carga del catalogo
    data/          ingredientes y recetas
  lib/
    planner.ts     motor del menu semanal
    shopping.ts    agregacion de la lista de compras
    queries.ts     acceso a datos
    session.ts     sesion JWT en cookie
```

## Nota sobre los valores nutricionales

Son estimaciones por porcion calculadas sobre ingredientes tipicos. Sirven como
referencia y **no reemplazan una indicacion medica o nutricional**. Lo mismo aplica a
las exclusiones por alergia: el filtro cubre los ingredientes registrados en cada
receta, pero siempre revisa la preparacion si hay una alergia seria de por medio.

## Ideas para la siguiente iteracion

- Sobras y batch cooking: cocinar una vez y planificar el reuso al dia siguiente.
- Precios por producto para estimar el costo de la semana.
- Compartir el menu con otra persona de la casa.
- Recuperacion de contrasena por correo.
- Recetas propias cargadas por la usuaria.
- Modo offline real con service worker (hoy solo hay manifest instalable).
