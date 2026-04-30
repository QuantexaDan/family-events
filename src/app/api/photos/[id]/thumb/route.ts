import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { photos } from "@/lib/schema";
import { requireAuth } from "@/lib/auth";
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

  const thumbFilename = photo.filename.replace(/\.[^.]+$/, "_thumb.webp");
  const filePath = path.join(
    process.cwd(),
    "uploads",
    "photos",
    photo.eventId,
    thumbFilename
  );

  try {
    const file = await fs.readFile(filePath);
    return new Response(file, {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Thumbnail not found", { status: 404 });
  }
}
