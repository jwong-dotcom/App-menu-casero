import { DESAYUNOS } from "./recipes-desayuno";
import { EXTRAS } from "./recipes-extra";
import { PRINCIPALES } from "./recipes-principal";
import { PRINCIPALES_2 } from "./recipes-principal-2";
import type { RecipeSeed } from "./types";

export { INGREDIENTS } from "./ingredients";
export type { RecipeSeed, IngredientRef } from "./types";

export const RECIPES: RecipeSeed[] = [
  ...DESAYUNOS,
  ...PRINCIPALES,
  ...PRINCIPALES_2,
  ...EXTRAS,
];
