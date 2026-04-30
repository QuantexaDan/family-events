import { NextRequest } from "next/server";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { photos, events, users } from "@/lib/schema";
import { requireAuth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import sharp from "sharp";
import fs from "fs/promises";
import path from "path";

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function uploadsDir(eventId: string) {
  return path.join(process.cwd(), "uploads", "photos", eventId);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const event = db.select().from(events).where(eq(events.id, id)).get();
  if (!event) return Response.json({ error: "Event not found" }, { status: 404 });

  const allPhotos = db
    .select({
      id: photos.id,
      filename: photos.filename,
      originalName: photos.originalName,
      mimeType: photos.mimeType,
      caption: photos.caption,
      createdAt: photos.createdAt,
      uploadedBy: photos.uploadedBy,
      displayName: users.displayName,
    })
    .from(photos)
    .innerJoin(users, eq(photos.uploadedBy, users.id))
    .where(eq(photos.eventId, id))
    .orderBy(photos.createdAt)
    .all();

  return Response.json(
    allPhotos.map((p) => ({
      ...p,
      isOwn: p.uploadedBy === user.id,
    }))
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const event = db.select().from(events).where(eq(events.id, id)).get();
  if (!event) return Response.json({ error: "Event not found" }, { status: 404 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const caption = (formData.get("caption") as string | null)?.trim() || null;

  if (!file) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return Response.json(
      { error: "File type not allowed. Use JPEG, PNG, WebP, or GIF." },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE) {
    return Response.json(
      { error: "File too large. Maximum size is 10 MB." },
      { status: 400 }
    );
  }

  const photoId = nanoid();
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const filename = `${photoId}.${ext}`;
  const thumbFilename = `${photoId}_thumb.webp`;

  const dir = uploadsDir(id);
  await fs.mkdir(dir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());

  await fs.writeFile(path.join(dir, filename), buffer);

  await sharp(buffer)
    .resize(400, null, { withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(path.join(dir, thumbFilename));

  db.insert(photos)
    .values({
      id: photoId,
      eventId: id,
      uploadedBy: user.id,
      filename,
      originalName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      caption,
      createdAt: new Date(),
    })
    .run();

  return Response.json({ ok: true, id: photoId });
}
