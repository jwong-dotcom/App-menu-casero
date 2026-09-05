import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  if (await getSession()) redirect("/plan");

  return (
    <main className="flex min-h-dvh flex-col justify-center px-5 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 text-3xl">
            🍽️
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Menu Casero</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Deja de preguntarte que cocinar manana.
          </p>
        </div>
        {children}
      </div>
    </main>
  );
}
