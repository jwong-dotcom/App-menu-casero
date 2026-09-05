"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { exclusions, favorites, pantry, preferences } from "@/db/schema";
import { requireSession } from "@/lib/session";

export type PrefsState = { error?: string; notice?: string };

const prefsSchema = z.object({
  adults: z.coerce.number().int().min(1).max(20),
  children: z.coerce.number().int().min(0).max(20),
  includeBreakfast: z.coerce.boolean(),
  includeLunch: z.coerce.boolean(),
  includeDinner: z.coerce.boolean(),
  maxPrepMinutes: z.coerce.number().int().min(15).max(240),
  budgetLevel: z.coerce.number().int().min(1).max(3),
  dietTags: z.array(z.string()).max(10),
});

export async function savePreferences(
  _prev: PrefsState,
  formData: FormData,
): Promise<PrefsState> {
  const session = await requireSession();
  const parsed = prefsSchema.safeParse({
    adults: formData.get("adults"),
    children: formData.get("children"),
    includeBreakfast: formData.get("includeBreakfast") === "on",
    includeLunch: formData.get("includeLunch") === "on",
    includeDinner: formData.get("includeDinner") === "on",
    maxPrepMinutes: formData.get("maxPrepMinutes"),
    budgetLevel: formData.get("budgetLevel"),
    dietTags: formData.getAll("dietTags").map(String),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos ingresados." };
  }
  if (!parsed.data.includeBreakfast && !parsed.data.includeLunch && !parsed.data.includeDinner) {
    return { error: "Selecciona al menos una comida del dia." };
  }

  await db
    .update(preferences)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(preferences.userId, session.userId));

  revalidatePath("/preferencias");
  revalidatePath("/plan");
  revalidatePath("/lista");
  return { notice: "Preferencias guardadas. Regenera el menu para aplicarlas." };
}

const exclusionSchema = z.object({
  ingredientId: z.string().uuid().optional(),
  freeText: z.string().trim().min(2).max(120).optional(),
  reason: z.enum(["salud", "gusto"]),
});

export async function addExclusion(formData: FormData): Promise<PrefsState> {
  const session = await requireSession();
  const raw = {
    ingredientId: (formData.get("ingredientId") as string) || undefined,
    freeText: (formData.get("freeText") as string)?.trim() || undefined,
    reason: (formData.get("reason") as string) || "gusto",
  };
  const parsed = exclusionSchema.safeParse(raw);
  if (!parsed.success || (!parsed.data.ingredientId && !parsed.data.freeText)) {
    return { error: "Elige un ingrediente de la lista o escribe su nombre." };
  }

  await db.insert(exclusions).values({
    userId: session.userId,
    ingredientId: parsed.data.ingredientId ?? null,
    freeText: parsed.data.ingredientId ? null : (parsed.data.freeText ?? null),
    reason: parsed.data.reason,
  });

  revalidatePath("/preferencias");
  revalidatePath("/plan");
  return { notice: "Alimento excluido. Regenera el menu para aplicarlo." };
}

export async function removeExclusion(formData: FormData): Promise<void> {
  const session = await requireSession();
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return;

  await db
    .delete(exclusions)
    .where(and(eq(exclusions.id, id.data), eq(exclusions.userId, session.userId)));

  revalidatePath("/preferencias");
  revalidatePath("/plan");
}

export async function togglePantry(formData: FormData): Promise<void> {
  const session = await requireSession();
  const parsed = z
    .object({ ingredientId: z.string().uuid(), inPantry: z.string() })
    .safeParse({
      ingredientId: formData.get("ingredientId"),
      inPantry: formData.get("inPantry"),
    });
  if (!parsed.success) return;

  if (parsed.data.inPantry === "true") {
    await db
      .delete(pantry)
      .where(
        and(eq(pantry.userId, session.userId), eq(pantry.ingredientId, parsed.data.ingredientId)),
      );
  } else {
    await db
      .insert(pantry)
      .values({ userId: session.userId, ingredientId: parsed.data.ingredientId })
      .onConflictDoNothing();
  }

  revalidatePath("/lista");
}

export async function toggleFavorite(formData: FormData): Promise<void> {
  const session = await requireSession();
  const parsed = z
    .object({ recipeId: z.string().uuid(), isFavorite: z.string() })
    .safeParse({
      recipeId: formData.get("recipeId"),
      isFavorite: formData.get("isFavorite"),
    });
  if (!parsed.success) return;

  if (parsed.data.isFavorite === "true") {
    await db
      .delete(favorites)
      .where(
        and(eq(favorites.userId, session.userId), eq(favorites.recipeId, parsed.data.recipeId)),
      );
  } else {
    await db
      .insert(favorites)
      .values({ userId: session.userId, recipeId: parsed.data.recipeId })
      .onConflictDoNothing();
  }

  revalidatePath("/recetas");
  revalidatePath("/plan");
}
