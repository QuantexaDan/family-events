import { NextRequest } from "next/server";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { categories } from "@/lib/schema";
import { requireAuth, requireAdmin } from "@/lib/auth";

export async function GET() {
  const user = await requireAuth();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const all = db.select().from(categories).orderBy(categories.name).all();
  return Response.json(all);
}

export async function POST(request: NextRequest) {
  const user = await requireAdmin();
  if (!user) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { name, color } = await request.json();

  if (!name || !color) {
    return Response.json({ error: "Name and color are required" }, { status: 400 });
  }

  if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
    return Response.json({ error: "Color must be a valid hex color (e.g. #FF5733)" }, { status: 400 });
  }

  const existing = db.select().from(categories).all();
  if (existing.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
    return Response.json({ error: "A category with that name already exists" }, { status: 409 });
  }
  if (existing.some((c) => c.color.toLowerCase() === color.toLowerCase())) {
    return Response.json({ error: "That color is already used by another category" }, { status: 409 });
  }

  const id = nanoid();
  db.insert(categories).values({
    id,
    name: name.trim(),
    color: color.toUpperCase(),
    createdAt: new Date(),
  }).run();

  return Response.json({ ok: true, id });
}
