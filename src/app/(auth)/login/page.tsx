import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata = { title: "Ingresar — Menu Casero" };

export default function LoginPage() {
  return (
    <div className="card p-6">
      <h2 className="mb-1 text-lg font-semibold">Ingresar</h2>
      <p className="mb-5 text-sm text-ink-soft">Entra con tu correo y contrasena.</p>
      <LoginForm />
      <p className="mt-5 text-center text-sm text-ink-soft">
        No tienes cuenta?{" "}
        <Link href="/registro" className="font-semibold text-brand-600 hover:underline">
          Crear cuenta
        </Link>
      </p>
    </div>
  );
}
