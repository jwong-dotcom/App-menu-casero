"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { MEAL_TYPES, mealPlanItems, mealPlans, shoppingChecks } from "@/db/schema";
import type { MealType } from "@/db/schema";
import {
  enabledMeals,
  getAllRecipes,
  getExclusions,
  getFavorites,
  getPreferences,
  getRecentRecipeIds,
  servingsFor,
} from "@/lib/queries";
import { filterRecipes, generatePlan, pickReplacement, seedFromString } from "@/lib/planner";
import { requireSession } from "@/lib/session";

const weekSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Semana invalida.");

export type PlanActionState = { error?: string; notice?: string };

/**
 * Genera (o regenera) el menu de una semana.
 * Borra el plan anterior de esa semana antes de crear el nuevo.
 */
export async function generateWeek(
  _prev: PlanActionState,
  formData: FormData,
): Promise<PlanActionState> {
  const session = await requireSession();
  const week = weekSchema.safeParse(formData.get("weekStart"));
  if (!week.success) return { error: "Semana invalida." };
  const weekStart = week.data;

  const prefs = await getPreferences(session.userId);
  const meals = enabledMeals(prefs);
  if (meals.length === 0) {
    return { error: "Activa al menos una comida (desayuno, almuerzo o cena) en Preferencias." };
  }

  const [allRecipes, userExclusions, favoriteIds] = await Promise.all([
    getAllRecipes(),
    getExclusions(session.userId),
    getFavorites(session.userId),
  ]);

  const available = filterRecipes(allRecipes, { prefs, exclusions: userExclusions });
  if (available.length === 0) {
    return {
      error:
        "Ningun plato pasa tus filtros actuales. Revisa los alimentos excluidos, el tiempo maximo y el presupuesto.",
    };
  }

  // Al regenerar, el plan de esta misma semana no cuenta como historial.
  const existing = await db
    .select({ id: mealPlans.id })
    .from(mealPlans)
    .where(and(eq(mealPlans.userId, session.userId), eq(mealPlans.weekStart, weekStart)));

  const recentIds = await getRecentRecipeIds(session.userId, weekStart, existing[0]?.id);
  const seed = seedFromString(`${session.userId}:${weekStart}:${Date.now()}`);
  const { slots, relaxedSlots } = generatePlan(
    available,
    meals,
    recentIds,
    seed,
    new Set(favoriteIds),
  );

  if (slots.length === 0) {
    return { error: "No se pudo armar el menu con las recetas disponibles." };
  }

  const servings = servingsFor(prefs);

  if (existing[0]) {
    await db.delete(mealPlans).where(eq(mealPlans.id, existing[0].id));
  }
  const [plan] = await db
    .insert(mealPlans)
    .values({ userId: session.userId, weekStart, servings: String(servings) })
    .returning();

  await db.insert(mealPlanItems).values(
    slots.map((s) => ({
      planId: plan.id,
      dayIndex: s.dayIndex,
      mealType: s.mealType,
      recipeId: s.recipeId,
    })),
  );

  revalidatePath("/plan");
  revalidatePath("/lista");

  const expected = meals.length * 7;
  const notices: string[] = [];
  if (slots.length < expected) {
    notices.push(
      `Se llenaron ${slots.length} de ${expected} comidas: no hay suficientes recetas que pasen tus filtros.`,
    );
  }
  if (relaxedSlots > 0) {
    notices.push(
      `${relaxedSlots} plato(s) se repiten respecto a las ultimas 4 semanas porque el catalogo filtrado se agoto.`,
    );
  }
  return notices.length > 0 ? { notice: notices.join(" ") } : {};
}

const swapSchema = z.object({
  weekStart: weekSchema,
  dayIndex: z.coerce.number().int().min(0).max(6),
  mealType: z.enum(MEAL_TYPES),
});

/** Cambia un solo plato del menu por otro que cumpla las mismas reglas. */
export async function swapMeal(formData: FormData): Promise<PlanActionState> {
  const session = await requireSession();
  const parsed = swapSchema.safeParse({
    weekStart: formData.get("weekStart"),
    dayIndex: formData.get("dayIndex"),
    mealType: formData.get("mealType"),
  });
  if (!parsed.success) return { error: "No se pudo identificar el plato a cambiar." };

  const { weekStart, dayIndex, mealType } = parsed.data;

  const [plan] = await db
    .select()
    .from(mealPlans)
    .where(and(eq(mealPlans.userId, session.userId), eq(mealPlans.weekStart, weekStart)));
  if (!plan) return { error: "Esa semana todavia no tiene menu." };

  const items = await db.select().from(mealPlanItems).where(eq(mealPlanItems.planId, plan.id));
  const target = items.find((i) => i.dayIndex === dayIndex && i.mealType === mealType);
  if (!target) return { error: "Ese plato ya no existe en el menu." };

  const [prefs, allRecipes, userExclusions] = await Promise.all([
    getPreferences(session.userId),
    getAllRecipes(),
    getExclusions(session.userId),
  ]);

  const available = filterRecipes(allRecipes, { prefs, exclusions: userExclusions });
  const usedInPlan = new Set(items.map((i) => i.recipeId));
  const recentIds = await getRecentRecipeIds(session.userId, weekStart, plan.id);

  const replacement = pickReplacement(
    available,
    mealType as MealType,
    usedInPlan,
    recentIds,
    seedFromString(`${target.id}:${Date.now()}`),
  );
  if (!replacement) {
    return {
      error: "No queda ningun plato alternativo que cumpla tus filtros para este tipo de comida.",
    };
  }

  await db
    .update(mealPlanItems)
    .set({ recipeId: replacement.id })
    .where(eq(mealPlanItems.id, target.id));

  revalidatePath("/plan");
  revalidatePath("/lista");
  return { notice: `Cambiado por ${replacement.name}.` };
}

const checkSchema = z.object({
  planId: z.string().uuid(),
  ingredientId: z.string().uuid(),
  checked: z.coerce.boolean(),
});

export async function setShoppingCheck(formData: FormData): Promise<void> {
  const session = await requireSession();
  const parsed = checkSchema.safeParse({
    planId: formData.get("planId"),
    ingredientId: formData.get("ingredientId"),
    checked: formData.get("checked") === "true",
  });
  if (!parsed.success) return;

  // El plan debe pertenecer al usuario de la sesion.
  const [plan] = await db
    .select({ id: mealPlans.id })
    .from(mealPlans)
    .where(and(eq(mealPlans.id, parsed.data.planId), eq(mealPlans.userId, session.userId)));
  if (!plan) return;

  await db
    .insert(shoppingChecks)
    .values({
      planId: parsed.data.planId,
      ingredientId: parsed.data.ingredientId,
      checked: parsed.data.checked,
    })
    .onConflictDoUpdate({
      target: [shoppingChecks.planId, shoppingChecks.ingredientId],
      set: { checked: parsed.data.checked },
    });

  revalidatePath("/lista");
}
