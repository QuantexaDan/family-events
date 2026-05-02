import { NextRequest } from "next/server";
import bcrypt from "bcrypt";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { getSession } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password) {
    console.log("[login] missing credentials, email length:", email.length, "password length:", password.length);
    return Response.json({ error: "Email and password are required" }, { status: 400 });
  }

  const user = db.select().from(users).where(eq(users.email, email)).get();
  if (!user) {
    console.log("[login] user not found for email:", email);
    return Response.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    console.log("[login] password mismatch for:", email);
    return Response.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const now = new Date();
  const session = await getSession();
  session.userId = user.id;
  session.previousLoginAt = user.lastLoginAt ? user.lastLoginAt.getTime() : null;
  await session.save();

  db.update(users).set({ lastLoginAt: now }).where(eq(users.id, user.id)).run();

  console.log("[login] success for:", email);
  return Response.json({ ok: true, user: { id: user.id, displayName: user.displayName, role: user.role } });
}
