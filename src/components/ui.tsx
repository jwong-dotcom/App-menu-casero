import Link from "next/link";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="mb-5 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function EmptyState({
  emoji,
  title,
  description,
  action,
}: {
  emoji: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center px-6 py-12 text-center">
      <span aria-hidden className="mb-3 text-4xl">
        {emoji}
      </span>
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-1 max-w-sm text-sm text-ink-soft">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Notice({ kind, children }: { kind: "info" | "error"; children: React.ReactNode }) {
  const styles =
    kind === "error" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-800";
  return (
    <p role={kind === "error" ? "alert" : "status"} className={`rounded-xl px-4 py-3 text-sm ${styles}`}>
      {children}
    </p>
  );
}

export function NutritionBar({
  label,
  value,
  unit,
  max,
}: {
  label: string;
  value: number;
  unit: string;
  max: number;
}) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-xs">
        <span className="text-ink-soft">{label}</span>
        <span className="font-semibold">
          {Math.round(value)}
          {unit}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-black/5">
        <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function RecipeLink({
  slug,
  children,
  className,
}: {
  slug: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link href={`/receta/${slug}`} className={className}>
      {children}
    </Link>
  );
}
