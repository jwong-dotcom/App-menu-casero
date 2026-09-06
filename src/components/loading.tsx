/**
 * Indicador de carga para las transiciones entre secciones.
 * Next.js muestra esto automaticamente (via los archivos loading.tsx de
 * cada ruta) mientras la pagina de destino espera su consulta a la base
 * de datos, sin bloquear la navegacion ni el resto del layout (el nav
 * sigue interactivo).
 */
export function Spinner({ className = "size-5" }: { className?: string }) {
  return (
    <svg
      className={`${className} animate-spin text-brand-600`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle className="opacity-20" cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function LoadingScreen({ label }: { label: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center gap-3 px-6 py-24 text-center"
    >
      <Spinner className="size-8" />
      <p className="text-sm text-ink-soft">{label}</p>
    </div>
  );
}
