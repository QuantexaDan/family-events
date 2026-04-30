import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { users, comments, eventResponses, photos } from "@/lib/schema";
import { requireAdmin } from "@/lib/auth";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import fs from "fs/promises";
import path from "path";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ error: "Unauthorized" }, { status: 403 });

  const { id } = await params;

  if (id === admin.id) {
    return Response.json({ error: "Cannot modify your own account" }, { status: 400 });
  }

  const user = db.select().from(users).where(eq(users.id, id)).get();
  if (!user) return Response.json({ error: "User not found" }, { status: 404 });

  const body = await request.json();

  if (body.role) {
    if (body.role !== "admin" && body.role !== "member") {
      return Response.json({ error: "Invalid role" }, { status: 400 });
    }
    db.update(users).set({ role: body.role }).where(eq(users.id, id)).run();
    return Response.json({ ok: true, action: "role_changed" });
  }

  if (body.password) {
    if (body.password.length < 6) {
      return Response.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }
    const passwordHash = await bcrypt.hash(body.password, 10);
    db.update(users).set({ passwordHash }).where(eq(users.id, id)).run();
    return Response.json({ ok: true, action: "password_reset" });
  }

  return Response.json({ error: "No valid action provided" }, { status: 400 });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ error: "Unauthorized" }, { status: 403 });

  const { id } = await params;

  if (id === admin.id) {
    return Response.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  const user = db.select().from(users).where(eq(users.id, id)).get();
  if (!user) return Response.json({ error: "User not found" }, { status: 404 });

  const userPhotos = db
    .select({ eventId: photos.eventId, filename: photos.filename })
    .from(photos)
    .where(eq(photos.uploadedBy, id))
    .all();

  for (const photo of userPhotos) {
    const dir = path.join(process.cwd(), "uploads", "photos", photo.eventId);
    const thumbFilename = photo.filename.replace(/\.[^.]+$/, "_thumb.webp");
    await Promise.allSettled([
      fs.unlink(path.join(dir, photo.filename)),
      fs.unlink(path.join(dir, thumbFilename)),
    ]);
  }

  db.delete(photos).where(eq(photos.uploadedBy, id)).run();
  db.delete(comments).where(eq(comments.userId, id)).run();
  db.delete(eventResponses).where(eq(eventResponses.userId, id)).run();
  db.delete(users).where(eq(users.id, id)).run();

  return Response.json({ ok: true });
}
