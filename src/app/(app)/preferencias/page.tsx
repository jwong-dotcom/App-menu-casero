import { MEAL_TYPES } from "@/db/schema";
import { PageHeader } from "@/components/ui";
import { filterRecipes } from "@/lib/planner";
import {
  enabledMeals,
  getAllIngredients,
  getAllRecipes,
  getExclusions,
  getPreferences,
  servingsFor,
} from "@/lib/queries";
import { requireSession } from "@/lib/session";
import { ExclusionsCard } from "./exclusions-card";
import { PreferencesForm } from "./preferences-form";

export const metadata = { title: "Preferencias — Menu Casero" };

export default async function PreferenciasPage() {
  const session = await requireSession();
  const [prefs, userExclusions, allIngredients, allRecipes] = await Promise.all([
    getPreferences(session.userId),
    getExclusions(session.userId),
    getAllIngredients(),
    getAllRecipes(),
  ]);

  const ingredientName = new Map(allIngredients.map((i) => [i.id, i.name]));

  // Cuantos platos distintos sobreviven a los filtros actuales. Cuatro semanas
  // sin repetir necesitan 28 por cada comida activada.
  const available = filterRecipes(allRecipes, { prefs, exclusions: userExclusions });
  const active = enabledMeals(prefs);
  const coverage = MEAL_TYPES.filter((type) => active.includes(type)).map((type) => ({
    type,
    label: MEAL_LABEL[type],
    count: available.filter((r) => r.mealTypes.includes(type)).length,
  }));
  // Almuerzo y cena comparten catalogo: juntos necesitan 56 platos distintos.
  const sharedMains = available.filter((r) => !r.mealTypes.includes("desayuno")).length;
  const sharedNeeded = 28 * active.filter((m) => m !== "desayuno").length;

  return (
    <>
      <PageHeader
        title="Preferencias"
        subtitle={`Hoy cocinas para ${servingsFor(prefs)} porciones por comida.`}
      />
      <div className="space-y-4">
        <CoverageCard coverage={coverage} sharedMains={sharedMains} sharedNeeded={sharedNeeded} />
        <PreferencesForm
          initial={{
            adults: prefs.adults,
            children: prefs.children,
            includeBreakfast: prefs.includeBreakfast,
            includeLunch: prefs.includeLunch,
            includeDinner: prefs.includeDinner,
            maxPrepMinutes: prefs.maxPrepMinutes,
            budgetLevel: prefs.budgetLevel,
            dietTags: prefs.dietTags,
          }}
        />
        <ExclusionsCard
          ingredients={allIngredients.map((i) => ({ id: i.id, name: i.name }))}
          exclusions={userExclusions.map((e) => ({
            id: e.id,
            label: e.ingredientId ? (ingredientName.get(e.ingredientId) ?? "Ingrediente") : (e.freeText ?? ""),
            reason: e.reason,
          }))}
        />
      </div>
    </>
  );
}

const MEAL_LABEL: Record<string, string> = {
  desayuno: "Desayunos",
  almuerzo: "Almuerzos",
  cena: "Cenas",
};

/**
 * Muestra si el catalogo filtrado alcanza para cuatro semanas sin repetir.
 * Es preferible avisarlo aqui que dejar que el menu repita platos en silencio.
 */
function CoverageCard({
  coverage,
  sharedMains,
  sharedNeeded,
}: {
  coverage: { type: string; label: string; count: number }[];
  sharedMains: number;
  sharedNeeded: number;
}) {
  const breakfastShort = coverage.some((c) => c.type === "desayuno" && c.count < 28);
  const mainsShort = sharedNeeded > 0 && sharedMains < sharedNeeded;
  const short = breakfastShort || mainsShort;

  return (
    <section className={`card p-4 ${short ? "border-amber-300 bg-amber-50/50" : ""}`}>
      <h2 className="text-sm font-bold">Variedad disponible con tus filtros</h2>
      <ul className="mt-3 space-y-1.5 text-sm">
        {coverage.map((item) => (
          <li key={item.type} className="flex justify-between gap-3">
            <span className="text-ink-soft">{item.label}</span>
            <span className="font-semibold">{item.count} platos</span>
          </li>
        ))}
        {sharedNeeded > 0 && (
          <li className="flex justify-between gap-3 border-t border-[color:var(--color-line)] pt-1.5">
            <span className="text-ink-soft">Platos principales distintos</span>
            <span className="font-semibold">
              {sharedMains} de {sharedNeeded} necesarios
            </span>
          </li>
        )}
      </ul>
      <p className="mt-3 text-xs text-ink-soft">
        {short
          ? "Con estos filtros no alcanzan los platos para cuatro semanas sin repetir. Sube el tiempo maximo, amplia el presupuesto o quita alguna exclusion."
          : "Alcanza para cuatro semanas seguidas sin repetir ningun plato."}
      </p>
    </section>
  );
}
