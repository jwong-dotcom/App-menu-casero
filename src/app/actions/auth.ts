"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { preferences, users } from "@/db/schema";
import { findUserByEmail } from "@/lib/queries";
import { createSession, destroySession } from "@/lib/session";

export type AuthState = { error?: string };

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Ingresa un correo valido."),
  password: z.string().min(1, "Ingresa tu contrasena."),
});

const registerSchema = z.object({
  name: z.string().trim().min(2, "Ingresa tu nombre."),
  email: z.string().trim().toLowerCase().email("Ingresa un correo valido."),
  password: z.string().min(8, "La contrasena debe tener al menos 8 caracteres."),
  adults: z.coerce.number().int().min(1).max(20),
  children: z.coerce.number().int().min(0).max(20),
});

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos invalidos." };
  }

  const user = await findUserByEmail(parsed.data.email);
  // Mismo mensaje para usuario inexistente y contrasena incorrecta.
  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    return { error: "Correo o contrasena incorrectos." };
  }

  await createSession({ userId: user.id, email: user.email, name: user.name });
  redirect("/plan");
}

export async function register(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos invalidos." };
  }

  const { name, email, password, adults, children } = parsed.data;
  if (await findUserByEmail(email)) {
    return { error: "Ese correo ya esta registrado. Inicia sesion." };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db.insert(users).values({ name, email, passwordHash }).returning();
  await db.insert(preferences).values({ userId: user.id, adults, children });

  await createSession({ userId: user.id, email: user.email, name: user.name });
  redirect("/plan");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
