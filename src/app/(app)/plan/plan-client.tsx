"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { generateWeek, swapMeal, type PlanActionState } from "@/app/actions/plan";
import {
  BoltIcon,
  CalendarDaysIcon,
  ClockIcon,
  FireIcon,
  MoonIcon,
  ChartBarIcon,
  StarIconSolid,
  SunIcon,
} from "@/components/icons";
import { EmptyState, Notice, NutritionBar } from "@/components/ui";
import { DAY_SHORT } from "@/lib/dates";

export type PlanMeal = {
  dayIndex: number;
  mealType: string;
  recipe: {
    id: string;
    slug: string;
    name: string;
    emoji: string;
    description: string;
    totalMinutes: number;
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    fiberG: number;
    sodiumMg: number;
    isFavorite: boolean;
  };
};

const MEAL_LABEL: Record<string, string> = {
  desayuno: "Desayuno",
  almuerzo: "Almuerzo",
  cena: "Cena",
};

const MEAL_ICON: Record<string, typeof SunIcon> = {
  desayuno: SunIcon,
  almuerzo: BoltIcon,
  cena: MoonIcon,
};

function GenerateButton({ hasPlan }: { hasPlan: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full sm:w-auto" disabled={pending}>
      {pending ? "Armando el menu..." : hasPlan ? "Regenerar semana" : "Generar menu de la semana"}
    </button>
  );
}

export function PlanClient({
  weekStart,
  prevWeek,
  nextWeek,
  isCurrentWeek,
  todayIndex,
  dayNames,
  activeMeals,
  meals,
  hasPlan,
}: {
  weekStart: string;
  prevWeek: string;
  nextWeek: string;
  isCurrentWeek: boolean;
  todayIndex: number;
  dayNames: string[];
  activeMeals: string[];
  meals: PlanMeal[];
  hasPlan: boolean;
}) {
  const [selectedDay, setSelectedDay] = useState(todayIndex);
  const dayStripRef = useRef<HTMLDivElement>(null);
  const [state, formAction] = useActionState<PlanActionState, FormData>(generateWeek, {});
  const [swapState, setSwapState] = useState<PlanActionState>({});
  const [isSwapping, startSwap] = useTransition();

  const dayMeals = meals.filter((m) => m.dayIndex === selectedDay);
  const dayTotals = dayMeals.reduce(
    (acc, m) => ({
      calories: acc.calories + m.recipe.calories,
      proteinG: acc.proteinG + m.recipe.proteinG,
      carbsG: acc.carbsG + m.recipe.carbsG,
      fatG: acc.fatG + m.recipe.fatG,
      fiberG: acc.fiberG + m.recipe.fiberG,
      sodiumMg: acc.sodiumMg + m.recipe.sodiumMg,
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0, sodiumMg: 0 },
  );

  // En mobile la tira de dias se desplaza: al abrir, el dia activo debe verse.
  useEffect(() => {
    dayStripRef.current
      ?.querySelector('[aria-pressed="true"]')
      ?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [selectedDay]);

  function onSwap(dayIndex: number, mealType: string) {
    const data = new FormData();
    data.set("weekStart", weekStart);
    data.set("dayIndex", String(dayIndex));
    data.set("mealType", mealType);
    startSwap(async () => {
      setSwapState(await swapMeal(data));
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Link href={`/plan?semana=${prevWeek}`} className="btn-secondary px-3 py-2 text-xs">
          ← Anterior
        </Link>
        {!isCurrentWeek && (
          <Link href="/plan" className="btn-ghost px-3 py-2 text-xs">
            Ir a esta semana
          </Link>
        )}
        <Link href={`/plan?semana=${nextWeek}`} className="btn-secondary px-3 py-2 text-xs">
          Siguiente →
        </Link>
      </div>

      <form action={formAction} className="space-y-3">
        <input type="hidden" name="weekStart" value={weekStart} />
        <GenerateButton hasPlan={hasPlan} />
        {state.error && <Notice kind="error">{state.error}</Notice>}
        {state.notice && <Notice kind="info">{state.notice}</Notice>}
      </form>

      {swapState.error && <Notice kind="error">{swapState.error}</Notice>}
      {swapState.notice && <Notice kind="info">{swapState.notice}</Notice>}

      {!hasPlan ? (
        <EmptyState
          icon={<CalendarDaysIcon className="size-6" />}
          title="Todavia no hay menu para esta semana"
          description="Genera el menu y te armamos los 7 dias sin repetir ningun plato de las ultimas 4 semanas, con su lista de compras."
        />
      ) : (
        <>
          {/* Selector de dia: scroll horizontal en mobile. */}
          <div
            ref={dayStripRef}
            className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0"
          >
            {dayNames.map((name, index) => {
              const active = index === selectedDay;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => setSelectedDay(index)}
                  aria-pressed={active}
                  className={`flex min-w-16 flex-col items-center rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                    active
                      ? "border-brand-500 bg-brand-600 text-white"
                      : "border-[color:var(--color-line)] bg-white text-ink-soft"
                  }`}
                >
                  <span className="md:hidden">{DAY_SHORT[index]}</span>
                  <span className="hidden md:inline">{name}</span>
                  {index === todayIndex && isCurrentWeek && (
                    <span className={`mt-0.5 text-[10px] ${active ? "text-white/80" : "text-brand-600"}`}>
                      hoy
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="space-y-3">
            {activeMeals.map((mealType) => {
              const meal = dayMeals.find((m) => m.mealType === mealType);
              const MealIcon = MEAL_ICON[mealType] ?? SunIcon;
              return (
                <section key={mealType} className="card overflow-hidden">
                  <div className="flex items-center gap-2 border-b border-[color:var(--color-line)] bg-brand-50/60 px-4 py-2">
                    <MealIcon className="size-4 text-brand-700" />
                    <h2 className="text-xs font-bold uppercase tracking-wide text-brand-700">
                      {MEAL_LABEL[mealType] ?? mealType}
                    </h2>
                  </div>

                  {!meal ? (
                    <p className="px-4 py-6 text-sm text-ink-soft">
                      No se pudo asignar un plato a este espacio. Regenera la semana o revisa tus
                      filtros.
                    </p>
                  ) : (
                    <div className="p-4">
                      <div className="flex gap-3">
                        <span aria-hidden className="text-3xl leading-none">
                          {meal.recipe.emoji}
                        </span>
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/receta/${meal.recipe.slug}`}
                            className="text-base font-semibold hover:text-brand-600"
                          >
                            {meal.recipe.name}
                            {meal.recipe.isFavorite && (
                              <span aria-label="favorito" className="ml-1 inline-flex align-middle">
                                <StarIconSolid className="size-4 text-brand-600" />
                              </span>
                            )}
                          </Link>
                          <p className="mt-1 line-clamp-2 text-sm text-ink-soft">
                            {meal.recipe.description}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <span className="chip">
                              <ClockIcon className="size-3.5" /> {meal.recipe.totalMinutes} min
                            </span>
                            <span className="chip">
                              <FireIcon className="size-3.5" /> {meal.recipe.calories} kcal
                            </span>
                            <span className="chip">
                              <ChartBarIcon className="size-3.5" /> {meal.recipe.proteinG} g proteina
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex gap-2">
                        <button
                          type="button"
                          onClick={() => onSwap(meal.dayIndex, meal.mealType)}
                          disabled={isSwapping}
                          className="btn-secondary flex-1 py-2 text-xs"
                        >
                          {isSwapping ? "Cambiando..." : "No me apetece, cambiar"}
                        </button>
                        <Link
                          href={`/receta/${meal.recipe.slug}`}
                          className="btn-ghost px-3 py-2 text-xs"
                        >
                          Ver receta
                        </Link>
                      </div>
                    </div>
                  )}
                </section>
              );
            })}
          </div>

          {dayMeals.length > 0 && (
            <section className="card p-4">
              <h2 className="mb-3 text-sm font-bold">
                Total del dia · {dayNames[selectedDay]}
              </h2>
              <p className="mb-3 text-2xl font-bold">
                {Math.round(dayTotals.calories)}{" "}
                <span className="text-sm font-medium text-ink-soft">kcal por persona</span>
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <NutritionBar label="Proteina" value={dayTotals.proteinG} unit=" g" max={120} />
                <NutritionBar label="Carbohidratos" value={dayTotals.carbsG} unit=" g" max={330} />
                <NutritionBar label="Grasas" value={dayTotals.fatG} unit=" g" max={90} />
                <NutritionBar label="Fibra" value={dayTotals.fiberG} unit=" g" max={35} />
                <NutritionBar label="Sodio" value={dayTotals.sodiumMg} unit=" mg" max={2300} />
              </div>
              <p className="mt-3 text-xs text-ink-soft">
                Valores aproximados por porcion, con fines referenciales. No reemplazan una
                indicacion medica o nutricional.
              </p>
            </section>
          )}
        </>
      )}
    </div>
  );
}
