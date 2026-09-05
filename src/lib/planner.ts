import type { MealType } from "@/db/schema";
import type { Exclusion, Preferences, RecipeWithIngredients } from "./queries";

export type Filters = {
  prefs: Preferences;
  exclusions: Exclusion[];
  favorites?: Set<string>;
};

/** Motivo por el que una receta quedo fuera. Se usa para explicar al usuario. */
export type RejectReason = "excluido" | "dieta" | "tiempo" | "presupuesto";

export function rejectReason(
  recipe: RecipeWithIngredients,
  { prefs, exclusions }: Filters,
): RejectReason | null {
  const excludedIds = new Set(
    exclusions.map((e) => e.ingredientId).filter((id): id is string => Boolean(id)),
  );
  const excludedText = exclusions
    .map((e) => e.freeText?.toLowerCase().trim())
    .filter((t): t is string => Boolean(t));

  for (const item of recipe.items) {
    if (item.optional) continue;
    if (excludedIds.has(item.ingredientId)) return "excluido";
    const name = item.name.toLowerCase();
    if (excludedText.some((t) => name.includes(t) || t.includes(name))) return "excluido";
  }

  for (const tag of prefs.dietTags) {
    if (!recipe.dietTags.includes(tag)) return "dieta";
  }

  if (recipe.prepMinutes + recipe.cookMinutes > prefs.maxPrepMinutes) return "tiempo";
  if (recipe.costLevel > prefs.budgetLevel) return "presupuesto";

  return null;
}

export function filterRecipes(
  recipes: RecipeWithIngredients[],
  filters: Filters,
): RecipeWithIngredients[] {
  return recipes.filter((r) => rejectReason(r, filters) === null);
}

/** Mezcla determinista a partir de una semilla, para que un mismo plan sea reproducible. */
function shuffle<T>(items: T[], seed: number): T[] {
  const arr = [...items];
  let state = seed || 1;
  for (let i = arr.length - 1; i > 0; i--) {
    state = (state * 1664525 + 1013904223) % 4294967296;
    const j = state % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function seedFromString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

export type Slot = { dayIndex: number; mealType: MealType };

export type GeneratedPlan = {
  slots: (Slot & { recipeId: string })[];
  /** Slots que tuvieron que repetir un plato de las ultimas 4 semanas por falta de variedad. */
  relaxedSlots: number;
};

/**
 * Genera el plan de la semana.
 *
 * Reglas:
 * - Ningun plato se repite dentro del plan.
 * - Ningun plato se repite respecto a los planes de las ultimas/proximas 3 semanas
 *   (`recentIds`), lo que garantiza 4 semanas sin repeticiones.
 * - Solo se usan recetas que pasan los filtros del usuario.
 * - Si el catalogo disponible se agota, se relajan primero las recetas mas antiguas.
 */
export function generatePlan(
  available: RecipeWithIngredients[],
  meals: MealType[],
  recentIds: Set<string>,
  seed: number,
  favorites: Set<string> = new Set(),
): GeneratedPlan {
  const used = new Set<string>();
  const slots: (Slot & { recipeId: string })[] = [];
  let relaxedSlots = 0;

  // Se atiende primero el tipo de comida con menos recetas disponibles: si
  // almuerzo y cena comparten platos, el pool mas escaso elige antes y no se
  // queda sin opciones al final.
  const poolSize = (mealType: MealType) =>
    available.filter((r) => r.mealTypes.includes(mealType)).length;
  const ordered = [...meals].sort((a, b) => poolSize(a) - poolSize(b));

  for (const mealType of ordered) {
    const pool = shuffle(
      available.filter((r) => r.mealTypes.includes(mealType)),
      seed + seedFromString(mealType),
    );
    // Los favoritos se ofrecen primero dentro del pool ya mezclado.
    pool.sort((a, b) => Number(favorites.has(b.id)) - Number(favorites.has(a.id)));

    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      let pick = pool.find((r) => !used.has(r.id) && !recentIds.has(r.id));
      if (!pick) {
        // Sin variedad suficiente: se permite repetir de semanas anteriores,
        // pero nunca dentro de la misma semana.
        pick = pool.find((r) => !used.has(r.id));
        if (pick) relaxedSlots++;
      }
      if (!pick) break; // catalogo agotado para este tipo de comida
      used.add(pick.id);
      slots.push({ dayIndex, mealType, recipeId: pick.id });
    }
  }

  return { slots, relaxedSlots };
}

/**
 * Elige un reemplazo para un slot concreto, respetando las mismas reglas
 * y evitando las recetas ya presentes en la semana.
 */
export function pickReplacement(
  available: RecipeWithIngredients[],
  mealType: MealType,
  usedInPlan: Set<string>,
  recentIds: Set<string>,
  seed: number,
): RecipeWithIngredients | null {
  const pool = shuffle(
    available.filter((r) => r.mealTypes.includes(mealType) && !usedInPlan.has(r.id)),
    seed,
  );
  return pool.find((r) => !recentIds.has(r.id)) ?? pool[0] ?? null;
}

export type NutritionTotals = {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  sodiumMg: number;
};

export const EMPTY_NUTRITION: NutritionTotals = {
  calories: 0,
  proteinG: 0,
  carbsG: 0,
  fatG: 0,
  fiberG: 0,
  sodiumMg: 0,
};

export function recipeNutrition(recipe: {
  calories: number;
  proteinG: string;
  carbsG: string;
  fatG: string;
  fiberG: string;
  sodiumMg: number;
}): NutritionTotals {
  return {
    calories: recipe.calories,
    proteinG: Number(recipe.proteinG),
    carbsG: Number(recipe.carbsG),
    fatG: Number(recipe.fatG),
    fiberG: Number(recipe.fiberG),
    sodiumMg: recipe.sodiumMg,
  };
}

export function addNutrition(a: NutritionTotals, b: NutritionTotals): NutritionTotals {
  return {
    calories: a.calories + b.calories,
    proteinG: a.proteinG + b.proteinG,
    carbsG: a.carbsG + b.carbsG,
    fatG: a.fatG + b.fatG,
    fiberG: a.fiberG + b.fiberG,
    sodiumMg: a.sodiumMg + b.sodiumMg,
  };
}
