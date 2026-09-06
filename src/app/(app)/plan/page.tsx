import { PageHeader } from "@/components/ui";
import { DAY_NAMES, addWeeks, formatWeekRange, mondayOf, todayIndex } from "@/lib/dates";
import {
  enabledMeals,
  getAllRecipes,
  getFavorites,
  getPlan,
  getPreferences,
  servingsFor,
} from "@/lib/queries";
import { requireSession } from "@/lib/session";
import { PlanClient, type PlanMeal } from "./plan-client";

export const metadata = { title: "Menu de la semana — Menu Casero" };

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ semana?: string }>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const currentWeek = mondayOf();
  const weekStart = /^\d{4}-\d{2}-\d{2}$/.test(params.semana ?? "")
    ? (params.semana as string)
    : currentWeek;

  const [prefs, saved, allRecipes, favoriteIds] = await Promise.all([
    getPreferences(session.userId),
    getPlan(session.userId, weekStart),
    getAllRecipes(),
    getFavorites(session.userId),
  ]);

  const recipeById = new Map(allRecipes.map((r) => [r.id, r]));
  const favorites = new Set(favoriteIds);

  const meals: PlanMeal[] =
    saved?.items.flatMap((item) => {
      const recipe = recipeById.get(item.recipeId);
      if (!recipe) return [];
      return [
        {
          dayIndex: item.dayIndex,
          mealType: item.mealType,
          recipe: {
            id: recipe.id,
            slug: recipe.slug,
            name: recipe.name,
            emoji: recipe.emoji,
            description: recipe.description,
            totalMinutes: recipe.prepMinutes + recipe.cookMinutes,
            calories: recipe.calories,
            proteinG: Number(recipe.proteinG),
            carbsG: Number(recipe.carbsG),
            fatG: Number(recipe.fatG),
            fiberG: Number(recipe.fiberG),
            sodiumMg: recipe.sodiumMg,
            isFavorite: favorites.has(recipe.id),
          },
        },
      ];
    }) ?? [];

  const servings = saved ? Number(saved.plan.servings) : servingsFor(prefs);

  return (
    <>
      <PageHeader
        title="Menu de la semana"
        subtitle={`${formatWeekRange(weekStart)} · ${servings} porciones por comida`}
      />
      <PlanClient
        weekStart={weekStart}
        prevWeek={addWeeks(weekStart, -1)}
        nextWeek={addWeeks(weekStart, 1)}
        isCurrentWeek={weekStart === currentWeek}
        todayIndex={weekStart === currentWeek ? todayIndex() : 0}
        dayNames={[...DAY_NAMES]}
        activeMeals={enabledMeals(prefs)}
        meals={meals}
        hasPlan={Boolean(saved)}
      />
    </>
  );
}
