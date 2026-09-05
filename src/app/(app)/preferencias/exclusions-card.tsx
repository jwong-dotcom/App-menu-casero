"use client";

import { useState, useTransition } from "react";
import { addExclusion, removeExclusion, type PrefsState } from "@/app/actions/preferences";
import { Notice } from "@/components/ui";

export function ExclusionsCard({
  ingredients,
  exclusions,
}: {
  ingredients: { id: string; name: string }[];
  exclusions: { id: string; label: string; reason: string }[];
}) {
  const [state, setState] = useState<PrefsState>({});
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState("");

  const matches = search.trim()
    ? ingredients
        .filter((i) => i.name.toLowerCase().includes(search.trim().toLowerCase()))
        .slice(0, 6)
    : [];

  function exclude(ingredientId: string | null, freeText: string | null, reason: string) {
    startTransition(async () => {
      const data = new FormData();
      if (ingredientId) data.set("ingredientId", ingredientId);
      if (freeText) data.set("freeText", freeText);
      data.set("reason", reason);
      setState(await addExclusion(data));
      setSearch("");
    });
  }

  return (
    <section className="card space-y-4 p-4">
      <div>
        <h2 className="text-sm font-bold">Alimentos que no quieres</h2>
        <p className="mt-1 text-xs text-ink-soft">
          Por alergia, indicacion medica o simplemente porque no te gustan. Ningun plato que los
          contenga entrara en tu menu.
        </p>
      </div>

      <div>
        <label className="label" htmlFor="exclusion-search">
          Buscar alimento
        </label>
        <input
          id="exclusion-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Ej: mani, camaron, leche"
          className="input"
          autoComplete="off"
        />

        {matches.length > 0 && (
          <ul className="mt-2 space-y-1">
            {matches.map((ingredient) => (
              <li
                key={ingredient.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-[color:var(--color-line)] px-3 py-2"
              >
                <span className="text-sm">{ingredient.name}</span>
                <span className="flex gap-1">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => exclude(ingredient.id, null, "salud")}
                    className="btn-ghost px-2 py-1 text-xs"
                  >
                    Por salud
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => exclude(ingredient.id, null, "gusto")}
                    className="btn-secondary px-2 py-1 text-xs"
                  >
                    No me gusta
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}

        {search.trim().length >= 2 && matches.length === 0 && (
          <button
            type="button"
            disabled={pending}
            onClick={() => exclude(null, search.trim(), "gusto")}
            className="btn-secondary mt-2 w-full py-2 text-xs"
          >
            Excluir &quot;{search.trim()}&quot; de todos modos
          </button>
        )}
      </div>

      {state.error && <Notice kind="error">{state.error}</Notice>}
      {state.notice && <Notice kind="info">{state.notice}</Notice>}

      {exclusions.length === 0 ? (
        <p className="text-sm text-ink-soft">Todavia no excluiste ningun alimento.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {exclusions.map((exclusion) => (
            <li key={exclusion.id}>
              <form
                action={removeExclusion}
                className={`chip ${exclusion.reason === "salud" ? "border-red-200 bg-red-50 text-red-700" : ""}`}
              >
                <input type="hidden" name="id" value={exclusion.id} />
                <span>
                  {exclusion.label}
                  {exclusion.reason === "salud" && " (salud)"}
                </span>
                <button type="submit" aria-label={`Quitar ${exclusion.label}`} className="ml-1">
                  ✕
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
