import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { notifications } from "@/lib/schema";
import { requireAuth } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const user = await requireAuth();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { ids } = await request.json();

  if (!Array.isArray(ids) || ids.length === 0) {
    return Response.json({ error: "ids array required" }, { status: 400 });
  }

  for (const id of ids) {
    db.update(notifications)
      .set({ read: 1 })
      .where(and(eq(notifications.id, id), eq(notifications.userId, user.id)))
      .run();
  }

  return Response.json({ ok: true });
}
