import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";
import { users } from "./schema";
import { eq } from "drizzle-orm";

export interface SessionData {
  userId?: string;
  previousLoginAt?: number | null;
}

const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET || "fallback-secret-change-me-in-env-at-least-32-chars!!",
  cookieName: "family-events-session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax" as const,
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session.userId) return null;
  const user = db.select().from(users).where(eq(users.id, session.userId)).get();
  if (!user) return null;
  return { ...user, previousLoginAt: session.previousLoginAt ?? null };
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin() {
  const user = await requireAuth();
  if (user.role !== "admin") redirect("/");
  return user;
}
