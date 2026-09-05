"use client";

import { useOptimistic, useTransition } from "react";
import { toggleFavorite } from "@/app/actions/preferences";

export function FavoriteButton({
  recipeId,
  isFavorite,
}: {
  recipeId: string;
  isFavorite: boolean;
}) {
  const [, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(isFavorite, (_, next: boolean) => next);

  return (
    <button
      type="button"
      aria-label={optimistic ? "Quitar de favoritos" : "Agregar a favoritos"}
      aria-pressed={optimistic}
      className="h-9 w-9 shrink-0 rounded-lg text-lg transition hover:bg-black/5"
      onClick={() =>
        startTransition(async () => {
          setOptimistic(!optimistic);
          const data = new FormData();
          data.set("recipeId", recipeId);
          data.set("isFavorite", String(isFavorite));
          await toggleFavorite(data);
        })
      }
    >
      {optimistic ? "⭐" : "☆"}
    </button>
  );
}
