import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { photos } from "@/lib/schema";
import { requireAuth, getCurrentUser } from "@/lib/auth";
import { eq } from "drizzle-orm";
import fs from "fs/promises";
import path from "path";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAuth();

  const { id } = await params;
  const photo = db.select().from(photos).where(eq(photos.id, id)).get();
  if (!photo) return new Response("Not found", { status: 404 });

  const filePath = path.join(
    process.cwd(),
    "uploads",
    "photos",
    photo.eventId,
    photo.filename
  );

  try {
    const file = await fs.readFile(filePath);
    return new Response(file, {
      headers: {
        "Content-Type": photo.mimeType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("File not found", { status: 404 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const photo = db.select().from(photos).where(eq(photos.id, id)).get();
  if (!photo) return Response.json({ error: "Not found" }, { status: 404 });

  if (photo.uploadedBy !== user.id && user.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const dir = path.join(process.cwd(), "uploads", "photos", photo.eventId);
  const thumbFilename = photo.filename.replace(/\.[^.]+$/, "_thumb.webp");

  await Promise.allSettled([
    fs.unlink(path.join(dir, photo.filename)),
    fs.unlink(path.join(dir, thumbFilename)),
  ]);

  db.delete(photos).where(eq(photos.id, id)).run();

  return Response.json({ ok: true });
}
