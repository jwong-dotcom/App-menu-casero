import Link from "next/link";
import { RegisterForm } from "./register-form";

export const metadata = { title: "Crear cuenta — Menu Casero" };

export default function RegisterPage() {
  return (
    <div className="card p-6">
      <h2 className="mb-1 text-lg font-semibold">Crear cuenta</h2>
      <p className="mb-5 text-sm text-ink-soft">
        Cuentanos para cuantas personas cocinas. Podras cambiarlo cuando quieras.
      </p>
      <RegisterForm />
      <p className="mt-5 text-center text-sm text-ink-soft">
        Ya tienes cuenta?{" "}
        <Link href="/login" className="font-semibold text-brand-600 hover:underline">
          Ingresar
        </Link>
      </p>
    </div>
  );
}
