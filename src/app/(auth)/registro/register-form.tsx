"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { register, type AuthState } from "@/app/actions/auth";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? "Creando cuenta..." : "Crear cuenta"}
    </button>
  );
}

export function RegisterForm() {
  const [state, formAction] = useActionState<AuthState, FormData>(register, {});

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="label" htmlFor="name">
          Nombre
        </label>
        <input id="name" name="name" required className="input" placeholder="Como te llamas" />
      </div>
      <div>
        <label className="label" htmlFor="email">
          Correo
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="input"
          placeholder="tucorreo@ejemplo.com"
        />
      </div>
      <div>
        <label className="label" htmlFor="password">
          Contrasena
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="input"
          placeholder="Minimo 8 caracteres"
        />
      </div>
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
            defaultValue={2}
            required
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
            defaultValue={0}
            required
            className="input"
          />
        </div>
      </div>
      {state.error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}
      <SubmitButton />
    </form>
  );
}
