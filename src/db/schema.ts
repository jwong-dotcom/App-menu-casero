import {
  boolean,
  date,
  index,
  integer,
  numeric,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

/** Tipos de comida soportados por el planificador. */
export const MEAL_TYPES = ["desayuno", "almuerzo", "cena"] as const;
export type MealType = (typeof MEAL_TYPES)[number];

/** Categorias de pasillo para agrupar la lista de compras. */
export const AISLES = [
  "verduras",
  "frutas",
  "carnes",
  "pescados",
  "lacteos",
  "abarrotes",
  "panaderia",
  "congelados",
  "condimentos",
  "bebidas",
  "otros",
] as const;
export type Aisle = (typeof AISLES)[number];

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const preferences = pgTable("preferences", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  /** Cantidad de personas adultas en la casa. */
  adults: smallint("adults").default(2).notNull(),
  /** Ninos: cuentan como media porcion al escalar recetas. */
  children: smallint("children").default(0).notNull(),
  includeBreakfast: boolean("include_breakfast").default(true).notNull(),
  includeLunch: boolean("include_lunch").default(true).notNull(),
  includeDinner: boolean("include_dinner").default(true).notNull(),
  /** Minutos maximos de preparacion aceptados (prep + coccion). */
  maxPrepMinutes: smallint("max_prep_minutes").default(90).notNull(),
  /** Etiquetas de dieta activas, ej: ["vegetariano", "sin-gluten"]. */
  dietTags: text("diet_tags").array().default([]).notNull(),
  /** Presupuesto: 1 economico, 2 medio, 3 sin restriccion. */
  budgetLevel: smallint("budget_level").default(3).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const ingredients = pgTable("ingredients", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  aisle: varchar("aisle", { length: 40 }).notNull(),
  /** Alergenos/etiquetas: ["gluten", "lacteos", "mariscos", ...]. */
  allergenTags: text("allergen_tags").array().default([]).notNull(),
});

export const recipes = pgTable(
  "recipes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: varchar("slug", { length: 140 }).notNull().unique(),
    name: varchar("name", { length: 140 }).notNull(),
    description: text("description").notNull(),
    /** Tipos de comida donde puede aparecer este plato. */
    mealTypes: text("meal_types").array().notNull(),
    emoji: varchar("emoji", { length: 8 }).default("🍽️").notNull(),
    prepMinutes: smallint("prep_minutes").notNull(),
    cookMinutes: smallint("cook_minutes").notNull(),
    /** Porciones para las que estan escritas las cantidades de la receta. */
    baseServings: smallint("base_servings").default(4).notNull(),
    /** 1 facil, 2 media, 3 dificil. */
    difficulty: smallint("difficulty").default(1).notNull(),
    /** 1 economico, 2 medio, 3 caro. */
    costLevel: smallint("cost_level").default(2).notNull(),
    /** Valores nutricionales POR PORCION. */
    calories: integer("calories").notNull(),
    proteinG: numeric("protein_g", { precision: 6, scale: 1 }).notNull(),
    carbsG: numeric("carbs_g", { precision: 6, scale: 1 }).notNull(),
    fatG: numeric("fat_g", { precision: 6, scale: 1 }).notNull(),
    fiberG: numeric("fiber_g", { precision: 6, scale: 1 }).notNull(),
    sodiumMg: integer("sodium_mg").notNull(),
    /** Etiquetas de dieta que cumple: ["vegetariano", "sin-gluten", ...]. */
    dietTags: text("diet_tags").array().default([]).notNull(),
    steps: text("steps").array().notNull(),
  },
  (t) => [index("recipes_meal_types_idx").on(t.mealTypes)],
);

export const recipeIngredients = pgTable(
  "recipe_ingredients",
  {
    recipeId: uuid("recipe_id")
      .references(() => recipes.id, { onDelete: "cascade" })
      .notNull(),
    ingredientId: uuid("ingredient_id")
      .references(() => ingredients.id, { onDelete: "restrict" })
      .notNull(),
    /** Cantidad para baseServings porciones. */
    quantity: numeric("quantity", { precision: 8, scale: 2 }).notNull(),
    unit: varchar("unit", { length: 20 }).notNull(),
    optional: boolean("optional").default(false).notNull(),
  },
  (t) => [primaryKey({ columns: [t.recipeId, t.ingredientId] })],
);

/** Ingredientes que el usuario NO quiere consumir (alergia, salud o gusto). */
export const exclusions = pgTable(
  "exclusions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    ingredientId: uuid("ingredient_id").references(() => ingredients.id, {
      onDelete: "cascade",
    }),
    /** Texto libre cuando el ingrediente no esta en el catalogo. */
    freeText: varchar("free_text", { length: 120 }),
    /** "salud" | "gusto" */
    reason: varchar("reason", { length: 20 }).default("gusto").notNull(),
  },
  (t) => [index("exclusions_user_idx").on(t.userId)],
);

export const mealPlans = pgTable(
  "meal_plans",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    /** Lunes de la semana planificada (YYYY-MM-DD). */
    weekStart: date("week_start").notNull(),
    /** Porciones calculadas al momento de generar (adultos + ninos*0.5). */
    servings: numeric("servings", { precision: 4, scale: 1 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique("meal_plans_user_week_uq").on(t.userId, t.weekStart)],
);

export const mealPlanItems = pgTable(
  "meal_plan_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    planId: uuid("plan_id")
      .references(() => mealPlans.id, { onDelete: "cascade" })
      .notNull(),
    /** 0 = lunes ... 6 = domingo */
    dayIndex: smallint("day_index").notNull(),
    mealType: varchar("meal_type", { length: 20 }).notNull(),
    recipeId: uuid("recipe_id")
      .references(() => recipes.id, { onDelete: "restrict" })
      .notNull(),
  },
  (t) => [
    unique("meal_plan_items_slot_uq").on(t.planId, t.dayIndex, t.mealType),
    index("meal_plan_items_recipe_idx").on(t.recipeId),
  ],
);

/** Marcado de items comprados en la lista del super. */
export const shoppingChecks = pgTable(
  "shopping_checks",
  {
    planId: uuid("plan_id")
      .references(() => mealPlans.id, { onDelete: "cascade" })
      .notNull(),
    ingredientId: uuid("ingredient_id")
      .references(() => ingredients.id, { onDelete: "cascade" })
      .notNull(),
    checked: boolean("checked").default(false).notNull(),
  },
  (t) => [primaryKey({ columns: [t.planId, t.ingredientId] })],
);

/** Despensa: lo que la usuaria ya tiene en casa y no debe comprar. */
export const pantry = pgTable(
  "pantry",
  {
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    ingredientId: uuid("ingredient_id")
      .references(() => ingredients.id, { onDelete: "cascade" })
      .notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.ingredientId] })],
);

export const favorites = pgTable(
  "favorites",
  {
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    recipeId: uuid("recipe_id")
      .references(() => recipes.id, { onDelete: "cascade" })
      .notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.recipeId] })],
);
