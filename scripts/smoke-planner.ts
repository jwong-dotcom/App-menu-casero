/**
 * Prueba de humo del motor de planificacion contra la base de datos real.
 * Genera 4 semanas seguidas y verifica que ningun plato se repita.
 *
 *   npx tsx scripts/smoke-planner.ts
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { createDatabase } from "../src/db/client";
import { ingredients, mealPlanItems, mealPlans, preferences, recipeIngredients, recipes, users } from "../src/db/schema";
import { filterRecipes, generatePlan, seedFromString } from "../src/lib/planner";
import { buildShoppingList } from "../src/lib/shopping";
import { addWeeks, mondayOf } from "../src/lib/dates";
import { formatQuantity } from "../src/lib/units";

const db = createDatabase(process.env.DATABASE_URL!);

async function loadRecipes() {
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
  const byRecipe = new Map<string, any[]>();
  for (const j of joinRows) {
    const list = byRecipe.get(j.recipeId) ?? [];
    list.push({ ...j, quantity: Number(j.quantity) });
    byRecipe.set(j.recipeId, list);
  }
  return recipeRows.map((r) => ({ ...r, items: byRecipe.get(r.id) ?? [] })) as any[];
}

async function main() {
  const email = `smoke-${Date.now()}@test.local`;
  const [user] = await db
    .insert(users)
    .values({ email, name: "Prueba", passwordHash: await bcrypt.hash("password123", 4) })
    .returning();
  const [prefs] = await db.insert(preferences).values({ userId: user.id }).returning();

  const allRecipes = await loadRecipes();
  const available = filterRecipes(allRecipes, { prefs, exclusions: [] });
  console.log(`Recetas en catalogo: ${allRecipes.length} | disponibles tras filtros: ${available.length}`);

  const meals = ["desayuno", "almuerzo", "cena"] as const;
  const usedByMeal = new Map<string, string[]>();
  let totalRelaxed = 0;

  for (let week = 0; week < 4; week++) {
    const weekStart = addWeeks(mondayOf(), week);
    const previous = await db.select().from(mealPlans).where(eq(mealPlans.userId, user.id));
    const previousIds = previous.length
      ? new Set(
          (
            await db.select().from(mealPlanItems)
          )
            .filter((i) => previous.some((p) => p.id === i.planId))
            .map((i) => i.recipeId),
        )
      : new Set<string>();

    const { slots, relaxedSlots } = generatePlan(
      available,
      [...meals],
      previousIds,
      seedFromString(`${user.id}:${weekStart}`),
    );
    totalRelaxed += relaxedSlots;

    const [plan] = await db
      .insert(mealPlans)
      .values({ userId: user.id, weekStart, servings: "2" })
      .returning();
    await db.insert(mealPlanItems).values(
      slots.map((s) => ({ planId: plan.id, dayIndex: s.dayIndex, mealType: s.mealType, recipeId: s.recipeId })),
    );

    for (const slot of slots) {
      const list = usedByMeal.get(slot.mealType) ?? [];
      list.push(slot.recipeId);
      usedByMeal.set(slot.mealType, list);
    }
    console.log(`Semana ${week + 1} (${weekStart}): ${slots.length} comidas, ${relaxedSlots} repeticiones forzadas`);
  }

  const allUsed = [...usedByMeal.values()].flat();
  const unique = new Set(allUsed);
  console.log(`\nComidas totales en 4 semanas: ${allUsed.length} | platos distintos: ${unique.size}`);
  console.log(`Repeticiones forzadas: ${totalRelaxed}`);
  if (allUsed.length !== unique.size) {
    const counts = new Map<string, number>();
    for (const id of allUsed) counts.set(id, (counts.get(id) ?? 0) + 1);
    const repeated = [...counts.entries()].filter(([, c]) => c > 1);
    const byId = new Map(allRecipes.map((r) => [r.id, r.name]));
    console.error("FALLO: platos repetidos ->", repeated.map(([id, c]) => `${byId.get(id)} x${c}`));
    process.exitCode = 1;
  } else {
    console.log("OK: ningun plato se repitio en 4 semanas.");
  }

  // Lista de compras de la primera semana.
  const [firstPlan] = await db.select().from(mealPlans).where(eq(mealPlans.userId, user.id));
  const items = await db.select().from(mealPlanItems).where(eq(mealPlanItems.planId, firstPlan.id));
  const byId = new Map(allRecipes.map((r) => [r.id, r]));
  const groups = buildShoppingList(
    items.map((i) => ({ recipe: byId.get(i.recipeId)!, servings: 5 })),
    new Set(),
  );
  const totalItems = groups.reduce((sum, g) => sum + g.items.length, 0);
  console.log(`\nLista de compras semana 1 (5 porciones): ${totalItems} productos en ${groups.length} secciones`);
  for (const group of groups.slice(0, 3)) {
    console.log(
      `  ${group.aisle}: ` +
        group.items.slice(0, 3).map((i) => `${i.name} ${i.amounts.map((a) => formatQuantity(a.quantity, a.unit)).join(" + ")}`).join(", "),
    );
  }

  await db.delete(users).where(eq(users.id, user.id));
  process.exit(process.exitCode ?? 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
