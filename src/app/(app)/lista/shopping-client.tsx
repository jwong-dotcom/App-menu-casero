"use client";

import { useOptimistic, useState, useTransition } from "react";
import { setShoppingCheck } from "@/app/actions/plan";
import { togglePantry } from "@/app/actions/preferences";

export type ShoppingItemView = {
  ingredientId: string;
  name: string;
  display: string;
  usedIn: string[];
  inPantry: boolean;
  checked: boolean;
};

export type ShoppingGroupView = {
  aisle: string;
  label: string;
  emoji: string;
  items: ShoppingItemView[];
};

export function ShoppingClient({
  planId,
  weekLabel,
  groups,
}: {
  planId: string;
  weekLabel: string;
  groups: ShoppingGroupView[];
}) {
  const [, startTransition] = useTransition();
  const [hidePantry, setHidePantry] = useState(false);
  const [copied, setCopied] = useState(false);

  const initialChecked = new Set(
    groups.flatMap((g) => g.items.filter((i) => i.checked).map((i) => i.ingredientId)),
  );
  const [checkedIds, toggleChecked] = useOptimistic(
    initialChecked,
    (current: Set<string>, id: string) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    },
  );

  function onToggle(item: ShoppingItemView) {
    const nextChecked = !checkedIds.has(item.ingredientId);
    startTransition(async () => {
      toggleChecked(item.ingredientId);
      const data = new FormData();
      data.set("planId", planId);
      data.set("ingredientId", item.ingredientId);
      data.set("checked", String(nextChecked));
      await setShoppingCheck(data);
    });
  }

  function onTogglePantry(item: ShoppingItemView) {
    startTransition(async () => {
      const data = new FormData();
      data.set("ingredientId", item.ingredientId);
      data.set("inPantry", String(item.inPantry));
      await togglePantry(data);
    });
  }

  function asText(): string {
    const lines = [`Lista de compras — ${weekLabel}`, ""];
    for (const group of groups) {
      const items = group.items.filter((i) => !(hidePantry && i.inPantry));
      if (items.length === 0) continue;
      lines.push(`${group.emoji} ${group.label.toUpperCase()}`);
      for (const item of items) lines.push(`- ${item.name}: ${item.display}`);
      lines.push("");
    }
    return lines.join("\n").trim();
  }

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(asText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  const pending = groups
    .flatMap((g) => g.items)
    .filter((i) => !checkedIds.has(i.ingredientId) && !(hidePantry && i.inPantry)).length;

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center gap-2 p-3">
        <p className="mr-auto text-sm font-medium">
          Faltan <span className="text-brand-600">{pending}</span> productos
        </p>
        <label className="chip cursor-pointer">
          <input
            type="checkbox"
            checked={hidePantry}
            onChange={(e) => setHidePantry(e.target.checked)}
            className="accent-brand-600"
          />
          Ocultar lo que ya tengo
        </label>
        <button type="button" onClick={onCopy} className="btn-secondary px-3 py-2 text-xs">
          {copied ? "Copiado" : "Copiar lista"}
        </button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(asText())}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary px-3 py-2 text-xs"
        >
          Enviar por WhatsApp
        </a>
      </div>

      {groups.map((group) => {
        const items = group.items.filter((i) => !(hidePantry && i.inPantry));
        if (items.length === 0) return null;
        return (
          <section key={group.aisle} className="card overflow-hidden">
            <h2 className="flex items-center gap-2 border-b border-[color:var(--color-line)] bg-brand-50/60 px-4 py-2 text-xs font-bold uppercase tracking-wide text-brand-700">
              <span aria-hidden>{group.emoji}</span>
              {group.label}
            </h2>
            <ul className="divide-y divide-[color:var(--color-line)]">
              {items.map((item) => {
                const isChecked = checkedIds.has(item.ingredientId);
                return (
                  <li key={item.ingredientId} className="flex items-start gap-3 px-4 py-3">
                    <input
                      type="checkbox"
                      id={`check-${item.ingredientId}`}
                      checked={isChecked}
                      onChange={() => onToggle(item)}
                      className="mt-0.5 h-5 w-5 shrink-0 accent-brand-600"
                    />
                    <label
                      htmlFor={`check-${item.ingredientId}`}
                      className={`min-w-0 flex-1 cursor-pointer ${
                        isChecked ? "text-ink-soft line-through" : ""
                      }`}
                    >
                      <span className="block text-sm font-medium">
                        {item.name} · {item.display}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-ink-soft">
                        Para: {item.usedIn.join(", ")}
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => onTogglePantry(item)}
                      title={
                        item.inPantry
                          ? "Quitar de mi despensa"
                          : "Marcar como algo que ya tengo en casa"
                      }
                      className={`shrink-0 rounded-lg px-2 py-1 text-xs ${
                        item.inPantry ? "bg-leaf-100 text-leaf-700" : "text-ink-soft hover:bg-black/5"
                      }`}
                    >
                      {item.inPantry ? "En despensa" : "Ya lo tengo"}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
