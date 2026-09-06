import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = "mc_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 dias

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "Falta AUTH_SECRET (minimo 32 caracteres). Genera uno con: openssl rand -base64 48",
    );
  }
  return new TextEncoder().encode(secret);
}

export type SessionPayload = { userId: string; email: string; name: string };

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secretKey());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    const { userId, email, name } = payload as Record<string, unknown>;
    if (typeof userId !== "string" || typeof email !== "string" || typeof name !== "string") {
      return null;
    }
    return { userId, email, name };
  } catch {
    return null;
  }
}

/**
 * Igual que getSession, pero manda al login si la sesion expiro.
 * Se usa en paginas y server actions para no responder con un error 500
 * cuando la cookie caduca mientras la usuaria tiene la app abierta.
 */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export const SESSION_COOKIE = COOKIE_NAME;
