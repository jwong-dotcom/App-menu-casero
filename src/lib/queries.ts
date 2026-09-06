import "server-only";
import { and, eq, gte, inArray, lte, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  exclusions,
  favorites,
  ingredients,
  mealPlanItems,
  mealPlans,
  pantry,
  preferences,
  recipeIngredients,
  recipes,
  shoppingChecks,
  users,
} from "@/db/schema";
import type { MealType } from "@/db/schema";
import { addWeeks } from "./dates";

export type Preferences = typeof preferences.$inferSelect;

export const DEFAULT_PREFERENCES = {
  adults: 2,
  children: 0,
  includeBreakfast: true,
  includeLunch: true,
  includeDinner: true,
  maxPrepMinutes: 90,
  dietTags: [] as string[],
  budgetLevel: 3,
};

/** Porciones a cocinar: cada nino cuenta como media porcion, minimo 1. */
export function servingsFor(prefs: { adults: number; children: number }): number {
  return Math.max(1, prefs.adults + prefs.children * 0.5);
}

export async function getPreferences(userId: string): Promise<Preferences> {
  const [row] = await db.select().from(preferences).where(eq(preferences.userId, userId));
  if (row) return row;
  const [created] = await db
    .insert(preferences)
    .values({ userId, ...DEFAULT_PREFERENCES })
    .returning();
  return created;
}

export function enabledMeals(prefs: Preferences): MealType[] {
  const meals: MealType[] = [];
  if (prefs.includeBreakfast) meals.push("desayuno");
  if (prefs.includeLunch) meals.push("almuerzo");
  if (prefs.includeDinner) meals.push("cena");
  return meals;
}

export type RecipeRow = typeof recipes.$inferSelect;

export type RecipeWithIngredients = RecipeRow & {
  items: {
    ingredientId: string;
    slug: string;
    name: string;
    aisle: string;
    allergenTags: string[];
    quantity: number;
    unit: string;
    optional: boolean;
  }[];
};

/** Todas las recetas con sus ingredientes resueltos. Se cachea por request. */
export async function getAllRecipes(): Promise<RecipeWithIngredients[]> {
  const [recipeRows, joinRows] = await Promise.all([
    db.select().from(recipes),
    db
      .select({
        recipeId: recipeIngredients.recipeId,
        ingredientId: recipeIngredients.ingredientId,
        quantity: recipeIngredients.quantity,
        unit: recipeIngredients.unit,
        optional: recipeIngredients.optional,
        slug: ingredients.slug,
        name: ingredients.name,
        aisle: ingredients.aisle,
        allergenTags: ingredients.allergenTags,
      })
      .from(recipeIngredients)
      .innerJoin(ingredients, eq(recipeIngredients.ingredientId, ingredients.id)),
  ]);

  const byRecipe = new Map<string, RecipeWithIngredients["items"]>();
  for (const j of joinRows) {
    const list = byRecipe.get(j.recipeId) ?? [];
    list.push({
      ingredientId: j.ingredientId,
      slug: j.slug,
      name: j.name,
      aisle: j.aisle,
      allergenTags: j.allergenTags,
      quantity: Number(j.quantity),
      unit: j.unit,
      optional: j.optional,
    });
    byRecipe.set(j.recipeId, list);
  }

  return recipeRows.map((r) => ({ ...r, items: byRecipe.get(r.id) ?? [] }));
}

export type Exclusion = typeof exclusions.$inferSelect;

export async function getExclusions(userId: string): Promise<Exclusion[]> {
  return db.select().from(exclusions).where(eq(exclusions.userId, userId));
}

export async function getPantry(userId: string): Promise<string[]> {
  const rows = await db
    .select({ ingredientId: pantry.ingredientId })
    .from(pantry)
    .where(eq(pantry.userId, userId));
  return rows.map((r) => r.ingredientId);
}

export async function getFavorites(userId: string): Promise<string[]> {
  const rows = await db
    .select({ recipeId: favorites.recipeId })
    .from(favorites)
    .where(eq(favorites.userId, userId));
  return rows.map((r) => r.recipeId);
}

/**
 * Recetas usadas en la ventana de +/- 3 semanas alrededor de `weekStart`.
 * Es la base de la regla "no repetir ningun plato durante 4 semanas".
 */
export async function getRecentRecipeIds(
  userId: string,
  weekStart: string,
  excludePlanId?: string,
): Promise<Set<string>> {
  const from = addWeeks(weekStart, -3);
  const to = addWeeks(weekStart, 3);
  const conditions = [
    eq(mealPlans.userId, userId),
    gte(mealPlans.weekStart, from),
    lte(mealPlans.weekStart, to),
  ];
  if (excludePlanId) conditions.push(ne(mealPlans.id, excludePlanId));

  const rows = await db
    .select({ recipeId: mealPlanItems.recipeId })
    .from(mealPlanItems)
    .innerJoin(mealPlans, eq(mealPlanItems.planId, mealPlans.id))
    .where(and(...conditions));

  return new Set(rows.map((r) => r.recipeId));
}

export type PlanRow = typeof mealPlans.$inferSelect;
export type PlanItemRow = typeof mealPlanItems.$inferSelect;

export async function getPlan(userId: string, weekStart: string) {
  const [plan] = await db
    .select()
    .from(mealPlans)
    .where(and(eq(mealPlans.userId, userId), eq(mealPlans.weekStart, weekStart)));
  if (!plan) return null;
  const items = await db.select().from(mealPlanItems).where(eq(mealPlanItems.planId, plan.id));
  return { plan, items };
}

export async function getPlanWeeks(userId: string): Promise<string[]> {
  const rows = await db
    .select({ weekStart: mealPlans.weekStart })
    .from(mealPlans)
    .where(eq(mealPlans.userId, userId))
    .orderBy(sql`${mealPlans.weekStart} desc`)
    .limit(12);
  return rows.map((r) => r.weekStart);
}

export async function getShoppingChecks(planId: string): Promise<Set<string>> {
  const rows = await db
    .select()
    .from(shoppingChecks)
    .where(and(eq(shoppingChecks.planId, planId), eq(shoppingChecks.checked, true)));
  return new Set(rows.map((r) => r.ingredientId));
}

export async function findUserByEmail(email: string) {
  const [row] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
  return row ?? null;
}

export async function getIngredientsByIds(ids: string[]) {
  if (ids.length === 0) return [];
  return db.select().from(ingredients).where(inArray(ingredients.id, ids));
}

export async function getAllIngredients() {
  return db.select().from(ingredients).orderBy(ingredients.name);
}
