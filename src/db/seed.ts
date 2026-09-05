import "dotenv/config";
import { createDatabase } from "./client";
import { INGREDIENTS, RECIPES } from "./data";
import { ingredients, recipeIngredients, recipes } from "./schema";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL en .env");
  const db = createDatabase(url);

  console.log(`Insertando ${INGREDIENTS.length} ingredientes...`);
  await db
    .insert(ingredients)
    .values(
      INGREDIENTS.map((i) => ({
        slug: i.slug,
        name: i.name,
        aisle: i.aisle,
        allergenTags: i.allergenTags ?? [],
      })),
    )
    .onConflictDoUpdate({
      target: ingredients.slug,
      set: { name: sqlExcluded("name"), aisle: sqlExcluded("aisle") },
    });

  const ingredientRows = await db.select().from(ingredients);
  const idBySlug = new Map(ingredientRows.map((r) => [r.slug, r.id]));

  console.log(`Insertando ${RECIPES.length} recetas...`);
  for (const r of RECIPES) {
    const [row] = await db
      .insert(recipes)
      .values({
        slug: r.slug,
        name: r.name,
        description: r.description,
        mealTypes: r.mealTypes,
        emoji: r.emoji,
        prepMinutes: r.prepMinutes,
        cookMinutes: r.cookMinutes,
        baseServings: r.baseServings,
        difficulty: r.difficulty,
        costLevel: r.costLevel,
        calories: r.nutrition.calories,
        proteinG: String(r.nutrition.proteinG),
        carbsG: String(r.nutrition.carbsG),
        fatG: String(r.nutrition.fatG),
        fiberG: String(r.nutrition.fiberG),
        sodiumMg: r.nutrition.sodiumMg,
        dietTags: r.dietTags,
        steps: r.steps,
      })
      .onConflictDoUpdate({
        target: recipes.slug,
        set: {
          name: sqlExcluded("name"),
          description: sqlExcluded("description"),
          mealTypes: sqlExcluded("meal_types"),
          steps: sqlExcluded("steps"),
          calories: sqlExcluded("calories"),
        },
      })
      .returning({ id: recipes.id });

    await db.delete(recipeIngredients).where(eqRecipe(row.id));
    await db.insert(recipeIngredients).values(
      r.ingredients.map(([slug, quantity, unit, optional]) => {
        const ingredientId = idBySlug.get(slug);
        if (!ingredientId) throw new Error(`Ingrediente desconocido: ${slug} (receta ${r.slug})`);
        return {
          recipeId: row.id,
          ingredientId,
          quantity: String(quantity),
          unit,
          optional: Boolean(optional),
        };
      }),
    );
  }

  console.log("Seed completo.");
}

// Helpers pequenos para evitar importar todo drizzle-orm en el seed.
import { eq, sql } from "drizzle-orm";
function sqlExcluded(column: string) {
  return sql.raw(`excluded."${column}"`);
}
function eqRecipe(id: string) {
  return eq(recipeIngredients.recipeId, id);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
