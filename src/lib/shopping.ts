import { AISLES } from "@/db/schema";
import type { RecipeWithIngredients } from "./queries";
import { purchasable } from "./units";

export type ShoppingAmount = { quantity: number; unit: string };

export type ShoppingItem = {
  ingredientId: string;
  name: string;
  aisle: string;
  /**
   * Un mismo ingrediente puede venir en unidades distintas segun la receta
   * (por ejemplo tomate en unidades y en gramos): se listan todas juntas en
   * una sola linea para que la lista tenga una fila por producto.
   */
  amounts: ShoppingAmount[];
  /** Recetas de la semana donde aparece este ingrediente. */
  usedIn: string[];
  inPantry: boolean;
};

export type ShoppingGroup = { aisle: string; items: ShoppingItem[] };

/**
 * Suma los ingredientes de todas las recetas de la semana, escalando cada receta
 * de sus porciones base a las porciones que cocina la familia.
 * Los ingredientes de la despensa se marcan pero no se eliminan de la lista.
 */
export function buildShoppingList(
  entries: { recipe: RecipeWithIngredients; servings: number }[],
  pantryIds: Set<string>,
): ShoppingGroup[] {
  const map = new Map<string, ShoppingItem>();

  for (const { recipe, servings } of entries) {
    const factor = servings / recipe.baseServings;
    for (const item of recipe.items) {
      const quantity = item.quantity * factor;
      const existing = map.get(item.ingredientId);
      if (existing) {
        const amount = existing.amounts.find((a) => a.unit === item.unit);
        if (amount) amount.quantity += quantity;
        else existing.amounts.push({ quantity, unit: item.unit });
        if (!existing.usedIn.includes(recipe.name)) existing.usedIn.push(recipe.name);
      } else {
        map.set(item.ingredientId, {
          ingredientId: item.ingredientId,
          name: item.name,
          aisle: item.aisle,
          amounts: [{ quantity, unit: item.unit }],
          usedIn: [recipe.name],
          inPantry: pantryIds.has(item.ingredientId),
        });
      }
    }
  }

  const items = [...map.values()].map((i) => ({
    ...i,
    amounts: i.amounts.map((a) => ({ ...a, quantity: purchasable(a.quantity, a.unit) })),
  }));

  const order = new Map(AISLES.map((a, i) => [a as string, i]));
  const groups = new Map<string, ShoppingItem[]>();
  for (const item of items) {
    const list = groups.get(item.aisle) ?? [];
    list.push(item);
    groups.set(item.aisle, list);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => (order.get(a) ?? 99) - (order.get(b) ?? 99))
    .map(([aisle, list]) => ({
      aisle,
      items: list.sort((a, b) => a.name.localeCompare(b.name)),
    }));
}

export const AISLE_LABELS: Record<string, string> = {
  verduras: "Verduras",
  frutas: "Frutas",
  carnes: "Carnes y huevos",
  pescados: "Pescados y mariscos",
  lacteos: "Lacteos",
  abarrotes: "Abarrotes",
  panaderia: "Panaderia",
  congelados: "Congelados",
  condimentos: "Condimentos",
  bebidas: "Bebidas",
  otros: "Otros",
};

export const AISLE_EMOJI: Record<string, string> = {
  verduras: "🥬",
  frutas: "🍎",
  carnes: "🥩",
  pescados: "🐟",
  lacteos: "🥛",
  abarrotes: "🛒",
  panaderia: "🍞",
  congelados: "🧊",
  condimentos: "🧂",
  bebidas: "🥤",
  otros: "📦",
};
