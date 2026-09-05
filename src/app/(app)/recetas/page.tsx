import Link from "next/link";
import { ClockIcon, FireIcon, MagnifyingGlassIcon, StarIcon } from "@/components/icons";
import { EmptyState, PageHeader } from "@/components/ui";
import { MEAL_TYPES } from "@/db/schema";
import { getAllRecipes, getExclusions, getFavorites, getPreferences } from "@/lib/queries";
import { rejectReason } from "@/lib/planner";
import { requireSession } from "@/lib/session";
import { FavoriteButton } from "./favorite-button";

export const metadata = { title: "Recetas — Menu Casero" };

const MEAL_LABEL: Record<string, string> = {
  desayuno: "Desayunos",
  almuerzo: "Almuerzos",
  cena: "Cenas",
};

const REJECT_LABEL: Record<string, string> = {
  excluido: "Tiene un alimento que excluiste",
  dieta: "No cumple tu dieta",
  tiempo: "Toma mas tiempo del que definiste",
  presupuesto: "Sobre tu presupuesto",
};

export default async function RecetasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tipo?: string; fav?: string }>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const query = (params.q ?? "").trim().toLowerCase();
  const mealFilter = MEAL_TYPES.includes(params.tipo as never) ? params.tipo : undefined;
  const onlyFavorites = params.fav === "1";

  const [allRecipes, favoriteIds, prefs, userExclusions] = await Promise.all([
    getAllRecipes(),
    getFavorites(session.userId),
    getPreferences(session.userId),
    getExclusions(session.userId),
  ]);

  const favorites = new Set(favoriteIds);
  const filtered = allRecipes
    .filter((r) => (mealFilter ? r.mealTypes.includes(mealFilter) : true))
    .filter((r) => (onlyFavorites ? favorites.has(r.id) : true))
    .filter((r) =>
      query
        ? r.name.toLowerCase().includes(query) ||
          r.description.toLowerCase().includes(query) ||
          r.items.some((i) => i.name.toLowerCase().includes(query))
        : true,
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      <PageHeader
        title="Recetas"
        subtitle={`${allRecipes.length} platos en el catalogo. Marca tus favoritos para que aparezcan mas seguido.`}
      />

      <form method="get" className="mb-4 space-y-3">
        <input
          type="search"
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="Buscar por plato o ingrediente"
          className="input"
        />
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
          <FilterChip label="Todos" href="/recetas" active={!mealFilter && !onlyFavorites} />
          {MEAL_TYPES.map((type) => (
            <FilterChip
              key={type}
              label={MEAL_LABEL[type]}
              href={`/recetas?tipo=${type}`}
              active={mealFilter === type}
            />
          ))}
          <FilterChip
            label={
              <>
                <StarIcon className="size-3.5" /> Favoritos
              </>
            }
            href="/recetas?fav=1"
            active={onlyFavorites}
          />
        </div>
        <button type="submit" className="btn-secondary w-full py-2 text-xs sm:w-auto">
          Buscar
        </button>
      </form>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<MagnifyingGlassIcon className="size-6" />}
          title="Sin resultados"
          description="Prueba con otro nombre de plato o ingrediente, o quita los filtros."
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {filtered.map((recipe) => {
            const reason = rejectReason(recipe, { prefs, exclusions: userExclusions });
            return (
              <li key={recipe.id} className="card flex gap-3 p-4">
                <span aria-hidden className="text-3xl leading-none">
                  {recipe.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/receta/${recipe.slug}`}
                    className="text-sm font-semibold hover:text-brand-600"
                  >
                    {recipe.name}
                  </Link>
                  <p className="mt-1 line-clamp-2 text-xs text-ink-soft">{recipe.description}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="chip">
                      <ClockIcon className="size-3.5" /> {recipe.prepMinutes + recipe.cookMinutes} min
                    </span>
                    <span className="chip">
                      <FireIcon className="size-3.5" /> {recipe.calories} kcal
                    </span>
                  </div>
                  {reason && (
                    <p className="mt-2 text-xs text-amber-700">
                      Fuera de tu menu: {REJECT_LABEL[reason]}
                    </p>
                  )}
                </div>
                <FavoriteButton recipeId={recipe.id} isFavorite={favorites.has(recipe.id)} />
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

function FilterChip({
  label,
  href,
  active,
}: {
  label: React.ReactNode;
  href: string;
  active: boolean;
}) {
  return (
    <Link href={href} className={`chip shrink-0 ${active ? "chip-active" : ""}`}>
      {label}
    </Link>
  );
}
