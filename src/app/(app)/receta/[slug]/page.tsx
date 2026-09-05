import Link from "next/link";
import { notFound } from "next/navigation";
import { FavoriteButton } from "@/app/(app)/recetas/favorite-button";
import { BanknotesIcon, ChartBarIcon, ClockIcon, FireIcon } from "@/components/icons";
import { NutritionBar, PageHeader } from "@/components/ui";
import { getAllRecipes, getFavorites, getPreferences, servingsFor } from "@/lib/queries";
import { requireSession } from "@/lib/session";
import { formatQuantity } from "@/lib/units";

const DIFFICULTY = { 1: "Facil", 2: "Media", 3: "Elaborada" } as const;
const COST = { 1: "Economico", 2: "Precio medio", 3: "Mas caro" } as const;

export default async function RecetaPage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await requireSession();
  const { slug } = await params;

  const [allRecipes, favoriteIds, prefs] = await Promise.all([
    getAllRecipes(),
    getFavorites(session.userId),
    getPreferences(session.userId),
  ]);

  const recipe = allRecipes.find((r) => r.slug === slug);
  if (!recipe) notFound();

  const servings = servingsFor(prefs);
  const factor = servings / recipe.baseServings;

  return (
    <>
      <Link href="/recetas" className="mb-3 inline-block text-sm text-ink-soft hover:text-brand-600">
        ← Volver a recetas
      </Link>

      <PageHeader
        title={`${recipe.emoji} ${recipe.name}`}
        subtitle={recipe.description}
        action={<FavoriteButton recipeId={recipe.id} isFavorite={favoriteIds.includes(recipe.id)} />}
      />

      <div className="mb-4 flex flex-wrap gap-1.5">
        <span className="chip">
          <ClockIcon className="size-3.5" /> {recipe.prepMinutes} min prep
        </span>
        <span className="chip">
          <FireIcon className="size-3.5" /> {recipe.cookMinutes} min coccion
        </span>
        <span className="chip">
          <ChartBarIcon className="size-3.5" /> {DIFFICULTY[recipe.difficulty as 1 | 2 | 3] ?? "Media"}
        </span>
        <span className="chip">
          <BanknotesIcon className="size-3.5" />{" "}
          {COST[recipe.costLevel as 1 | 2 | 3] ?? "Precio medio"}
        </span>
        {recipe.dietTags.map((tag) => (
          <span key={tag} className="chip chip-active">
            {tag}
          </span>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="card p-4">
          <h2 className="mb-1 text-sm font-bold">Ingredientes</h2>
          <p className="mb-3 text-xs text-ink-soft">
            Cantidades ajustadas a {servings} porciones (tu casa).
          </p>
          <ul className="divide-y divide-[color:var(--color-line)]">
            {recipe.items.map((item) => (
              <li key={item.ingredientId} className="flex justify-between gap-3 py-2 text-sm">
                <span>
                  {item.name}
                  {item.optional && <span className="text-ink-soft"> (opcional)</span>}
                </span>
                <span className="shrink-0 font-medium">
                  {formatQuantity(item.quantity * factor, item.unit)}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card p-4">
          <h2 className="mb-3 text-sm font-bold">Preparacion</h2>
          <ol className="space-y-3">
            {recipe.steps.map((step, index) => (
              <li key={step} className="flex gap-3 text-sm">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                  {index + 1}
                </span>
                <p>{step}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="card p-4 md:col-span-2">
          <h2 className="mb-1 text-sm font-bold">Valor nutricional por porcion</h2>
          <p className="mb-3 text-2xl font-bold">
            {recipe.calories} <span className="text-sm font-medium text-ink-soft">kcal</span>
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <NutritionBar label="Proteina" value={Number(recipe.proteinG)} unit=" g" max={50} />
            <NutritionBar label="Carbohidratos" value={Number(recipe.carbsG)} unit=" g" max={110} />
            <NutritionBar label="Grasas" value={Number(recipe.fatG)} unit=" g" max={40} />
            <NutritionBar label="Fibra" value={Number(recipe.fiberG)} unit=" g" max={15} />
            <NutritionBar label="Sodio" value={recipe.sodiumMg} unit=" mg" max={1200} />
          </div>
          <p className="mt-3 text-xs text-ink-soft">
            Valores aproximados, calculados sobre ingredientes tipicos. Son referenciales y no
            reemplazan una indicacion medica o nutricional.
          </p>
        </section>
      </div>
    </>
  );
}
