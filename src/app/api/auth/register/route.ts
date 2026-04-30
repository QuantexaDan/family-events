import { NextRequest } from "next/server";
import bcrypt from "bcrypt";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { users, invites } from "@/lib/schema";
import { getSession } from "@/lib/auth";
import { eq, and, isNull } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const { code, email, password, displayName } = await request.json();

  if (!code || !email || !password || !displayName) {
    return Response.json({ error: "All fields are required" }, { status: 400 });
  }

  const invite = db
    .select()
    .from(invites)
    .where(and(eq(invites.code, code), isNull(invites.usedBy)))
    .get();

  if (!invite) {
    return Response.json({ error: "Invalid or already used invite code" }, { status: 400 });
  }

  if (invite.email && invite.email.toLowerCase() !== email.toLowerCase()) {
    return Response.json({ error: "This invite is for a different email address" }, { status: 400 });
  }

  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return Response.json({ error: "This invite has expired" }, { status: 400 });
  }

  const existing = db.select().from(users).where(eq(users.email, email.toLowerCase())).get();
  if (existing) {
    return Response.json({ error: "An account with this email already exists" }, { status: 400 });
  }

  if (password.length < 6) {
    return Response.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const userId = nanoid();
  const now = new Date();

  db.insert(users).values({
    id: userId,
    email: email.toLowerCase(),
    displayName,
    passwordHash,
    role: "member",
    createdAt: now,
  }).run();

  db.update(invites)
    .set({ usedBy: userId, usedAt: now })
    .where(eq(invites.id, invite.id))
    .run();

  const session = await getSession();
  session.userId = userId;
  await session.save();

  return Response.json({ ok: true, user: { id: userId, displayName, role: "member" } });
}
