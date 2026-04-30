import { NextRequest } from "next/server";
import bcrypt from "bcrypt";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { getSession } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return Response.json({ error: "Email and password are required" }, { status: 400 });
  }

  const user = db.select().from(users).where(eq(users.email, email.toLowerCase())).get();
  if (!user) {
    return Response.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return Response.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const now = new Date();
  const session = await getSession();
  session.userId = user.id;
  session.previousLoginAt = user.lastLoginAt ? user.lastLoginAt.getTime() : null;
  await session.save();

  db.update(users).set({ lastLoginAt: now }).where(eq(users.id, user.id)).run();

  return Response.json({ ok: true, user: { id: user.id, displayName: user.displayName, role: user.role } });
}
