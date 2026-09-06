import { redirect } from "next/navigation";
import { logout } from "@/app/actions/auth";
import { FireIcon } from "@/components/icons";
import { BottomNav, SideNav } from "@/components/nav";
import { getSession } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-dvh">
      <SideNav userName={session.name} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[color:var(--color-line)] bg-white/95 px-4 py-3 backdrop-blur md:px-8">
          <div className="flex items-center gap-2 md:hidden">
            <span className="flex size-7 items-center justify-center rounded-lg bg-brand-600 text-white">
              <FireIcon className="size-4" />
            </span>
            <span className="text-sm font-bold">Menu Casero</span>
          </div>
          <p className="hidden text-sm text-ink-soft md:block">Hola, {session.name}</p>
          <form action={logout}>
            <button type="submit" className="btn-ghost px-3 py-1.5 text-xs">
              Cerrar sesion
            </button>
          </form>
        </header>
        <main className="flex-1 px-4 pb-24 pt-5 md:px-8 md:pb-10">
          <div className="mx-auto w-full max-w-4xl">{children}</div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
