import Link from "next/link";
import { ShoppingCartIcon } from "@/components/icons";
import { EmptyState, PageHeader } from "@/components/ui";
import { addWeeks, formatWeekRange, mondayOf } from "@/lib/dates";
import {
  getAllRecipes,
  getPantry,
  getPlan,
  getShoppingChecks,
} from "@/lib/queries";
import { requireSession } from "@/lib/session";
import { AISLE_EMOJI, AISLE_LABELS, buildShoppingList } from "@/lib/shopping";
import { formatQuantity } from "@/lib/units";
import { ShoppingClient, type ShoppingGroupView } from "./shopping-client";

export const metadata = { title: "Lista de compras — Menu Casero" };

export default async function ListaPage({
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

  const [saved, allRecipes, pantryIds] = await Promise.all([
    getPlan(session.userId, weekStart),
    getAllRecipes(),
    getPantry(session.userId),
  ]);

  if (!saved) {
    return (
      <>
        <PageHeader title="Lista de compras" subtitle={formatWeekRange(weekStart)} />
        <EmptyState
          icon={<ShoppingCartIcon className="size-6" />}
          title="Aun no hay lista para esta semana"
          description="La lista se arma sola a partir del menu. Genera primero el menu de la semana."
          action={
            <Link href={`/plan?semana=${weekStart}`} className="btn-primary">
              Ir al menu
            </Link>
          }
        />
      </>
    );
  }

  const recipeById = new Map(allRecipes.map((r) => [r.id, r]));
  const servings = Number(saved.plan.servings);
  const entries = saved.items.flatMap((item) => {
    const recipe = recipeById.get(item.recipeId);
    return recipe ? [{ recipe, servings }] : [];
  });

  const checked = await getShoppingChecks(saved.plan.id);
  const groups: ShoppingGroupView[] = buildShoppingList(entries, new Set(pantryIds)).map((g) => ({
    aisle: g.aisle,
    label: AISLE_LABELS[g.aisle] ?? g.aisle,
    emoji: AISLE_EMOJI[g.aisle] ?? "📦",
    items: g.items.map((i) => ({
      ingredientId: i.ingredientId,
      name: i.name,
      display: i.amounts.map((a) => formatQuantity(a.quantity, a.unit)).join(" + "),
      usedIn: i.usedIn,
      inPantry: i.inPantry,
      checked: checked.has(i.ingredientId),
    })),
  }));

  const total = groups.reduce((sum, g) => sum + g.items.length, 0);

  return (
    <>
      <PageHeader
        title="Lista de compras"
        subtitle={`${formatWeekRange(weekStart)} · ${total} productos para ${servings} porciones por comida`}
      />
      <div className="mb-4 flex items-center justify-between gap-2">
        <Link href={`/lista?semana=${addWeeks(weekStart, -1)}`} className="btn-secondary px-3 py-2 text-xs">
          ← Anterior
        </Link>
        <Link href={`/lista?semana=${addWeeks(weekStart, 1)}`} className="btn-secondary px-3 py-2 text-xs">
          Siguiente →
        </Link>
      </div>
      <ShoppingClient
        planId={saved.plan.id}
        weekLabel={formatWeekRange(weekStart)}
        groups={groups}
      />
    </>
  );
}
