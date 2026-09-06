"use client";

import { useOptimistic, useTransition } from "react";
import { toggleFavorite } from "@/app/actions/preferences";
import { StarIcon, StarIconSolid } from "@/components/icons";

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
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-brand-600 transition hover:bg-black/5"
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
      {optimistic ? <StarIconSolid className="size-5" /> : <StarIcon className="size-5" />}
    </button>
  );
}
