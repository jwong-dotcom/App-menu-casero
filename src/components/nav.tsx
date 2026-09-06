"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpenIcon, CalendarDaysIcon, CogIcon, FireIcon, ShoppingCartIcon } from "./icons";

const LINKS = [
  { href: "/plan", label: "Menu", Icon: CalendarDaysIcon },
  { href: "/lista", label: "Compras", Icon: ShoppingCartIcon },
  { href: "/recetas", label: "Recetas", Icon: BookOpenIcon },
  { href: "/preferencias", label: "Ajustes", Icon: CogIcon },
] as const;

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Barra inferior: navegacion principal en mobile. */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegacion principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[color:var(--color-line)] bg-white/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-lg">
        {LINKS.map((link) => {
          const active = isActive(pathname, link.href);
          return (
            <li key={link.href} className="flex-1">
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-16 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition ${
                  active ? "text-brand-600" : "text-ink-soft"
                }`}
              >
                <link.Icon className="size-6" />
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Barra lateral: navegacion en desktop. */
export function SideNav({ userName }: { userName: string }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 border-r border-[color:var(--color-line)] bg-white md:block">
      <div className="sticky top-0 flex h-dvh flex-col p-4">
        <Link href="/plan" className="mb-6 flex items-center gap-2 px-2 py-1">
          <span className="flex size-8 items-center justify-center rounded-lg bg-brand-600 text-white">
            <FireIcon className="size-5" />
          </span>
          <span className="text-base font-bold">Menu Casero</span>
        </Link>
        <ul className="space-y-1">
          {LINKS.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    active ? "bg-brand-50 text-brand-700" : "text-ink-soft hover:bg-black/5"
                  }`}
                >
                  <link.Icon className="size-5" />
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="mt-auto border-t border-[color:var(--color-line)] pt-4">
          <p className="truncate px-3 text-xs text-ink-soft">Sesion de {userName}</p>
        </div>
      </div>
    </aside>
  );
}
