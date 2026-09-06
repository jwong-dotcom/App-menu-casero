import type { MealType } from "../schema";

/** [slug del ingrediente, cantidad para baseServings, unidad, opcional?] */
export type IngredientRef = [string, number, string, boolean?];

export type RecipeSeed = {
  slug: string;
  name: string;
  description: string;
  mealTypes: MealType[];
  emoji: string;
  prepMinutes: number;
  cookMinutes: number;
  baseServings: number;
  /** 1 facil, 2 media, 3 dificil */
  difficulty: 1 | 2 | 3;
  /** 1 economico, 2 medio, 3 caro */
  costLevel: 1 | 2 | 3;
  /** Valores POR PORCION (aproximados, referenciales). */
  nutrition: {
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    fiberG: number;
    sodiumMg: number;
  };
  dietTags: string[];
  steps: string[];
  ingredients: IngredientRef[];
};
