import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { requireAuth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

export async function POST(request: NextRequest) {
  const user = await requireAuth();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { currentPassword, newPassword } = await request.json();

  if (!currentPassword || !newPassword) {
    return Response.json({ error: "Both current and new password are required" }, { status: 400 });
  }

  if (newPassword.length < 6) {
    return Response.json({ error: "New password must be at least 6 characters" }, { status: 400 });
  }

  const fullUser = db.select().from(users).where(eq(users.id, user.id)).get();
  if (!fullUser) return Response.json({ error: "User not found" }, { status: 404 });

  const valid = await bcrypt.compare(currentPassword, fullUser.passwordHash);
  if (!valid) {
    return Response.json({ error: "Current password is incorrect" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  db.update(users).set({ passwordHash }).where(eq(users.id, user.id)).run();

  return Response.json({ ok: true });
}
