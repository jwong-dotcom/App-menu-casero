"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { savePreferences, type PrefsState } from "@/app/actions/preferences";
import { Notice } from "@/components/ui";

const DIET_TAGS = [
  { value: "vegetariano", label: "Vegetariano" },
  { value: "vegano", label: "Vegano" },
  { value: "sin-gluten", label: "Sin gluten" },
  { value: "sin-lacteos", label: "Sin lacteos" },
  { value: "alto-proteina", label: "Alto en proteina" },
  { value: "bajo-calorias", label: "Bajo en calorias" },
];

const TIME_OPTIONS = [30, 45, 60, 90, 120, 180];

const BUDGET_OPTIONS = [
  { value: 1, label: "Economico" },
  { value: 2, label: "Medio" },
  { value: 3, label: "Sin restriccion" },
];

export type PreferencesInitial = {
  adults: number;
  children: number;
  includeBreakfast: boolean;
  includeLunch: boolean;
  includeDinner: boolean;
  maxPrepMinutes: number;
  budgetLevel: number;
  dietTags: string[];
};

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full sm:w-auto" disabled={pending}>
      {pending ? "Guardando..." : "Guardar preferencias"}
    </button>
  );
}

export function PreferencesForm({ initial }: { initial: PreferencesInitial }) {
  const [state, formAction] = useActionState<PrefsState, FormData>(savePreferences, {});

  return (
    <form action={formAction} className="card space-y-6 p-4">
      <fieldset>
        <legend className="mb-3 text-sm font-bold">Cuantas personas comen en casa</legend>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="adults">
              Adultos
            </label>
            <input
              id="adults"
              name="adults"
              type="number"
              min={1}
              max={20}
              defaultValue={initial.adults}
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="children">
              Ninos
            </label>
            <input
              id="children"
              name="children"
              type="number"
              min={0}
              max={20}
              defaultValue={initial.children}
              className="input"
            />
          </div>
        </div>
        <p className="mt-2 text-xs text-ink-soft">
          Cada nino cuenta como media porcion al calcular cantidades.
        </p>
      </fieldset>

      <fieldset>
        <legend className="mb-3 text-sm font-bold">Que comidas quieres planificar</legend>
        <div className="space-y-2">
          <Toggle name="includeBreakfast" label="Desayuno" defaultChecked={initial.includeBreakfast} />
          <Toggle name="includeLunch" label="Almuerzo" defaultChecked={initial.includeLunch} />
          <Toggle name="includeDinner" label="Cena" defaultChecked={initial.includeDinner} />
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-3 text-sm font-bold">Tiempo maximo por plato</legend>
        <select
          name="maxPrepMinutes"
          defaultValue={initial.maxPrepMinutes}
          className="input"
          aria-label="Tiempo maximo de preparacion"
        >
          {TIME_OPTIONS.map((minutes) => (
            <option key={minutes} value={minutes}>
              Hasta {minutes} minutos
            </option>
          ))}
        </select>
      </fieldset>

      <fieldset>
        <legend className="mb-3 text-sm font-bold">Presupuesto</legend>
        <select
          name="budgetLevel"
          defaultValue={initial.budgetLevel}
          className="input"
          aria-label="Nivel de presupuesto"
        >
          {BUDGET_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </fieldset>

      <fieldset>
        <legend className="mb-1 text-sm font-bold">Tipo de alimentacion</legend>
        <p className="mb-3 text-xs text-ink-soft">
          Si marcas varias, solo se usaran platos que cumplan todas.
        </p>
        <div className="flex flex-wrap gap-2">
          {DIET_TAGS.map((tag) => (
            <label key={tag.value} className="chip cursor-pointer">
              <input
                type="checkbox"
                name="dietTags"
                value={tag.value}
                defaultChecked={initial.dietTags.includes(tag.value)}
                className="accent-brand-600"
              />
              {tag.label}
            </label>
          ))}
        </div>
      </fieldset>

      {state.error && <Notice kind="error">{state.error}</Notice>}
      {state.notice && <Notice kind="info">{state.notice}</Notice>}
      <SaveButton />
    </form>
  );
}

function Toggle({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex items-center justify-between rounded-xl border border-[color:var(--color-line)] px-4 py-3">
      <span className="text-sm font-medium">{label}</span>
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="h-5 w-5 accent-brand-600"
      />
    </label>
  );
}
