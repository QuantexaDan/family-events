import { NextRequest } from "next/server";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { events, eventResponses } from "@/lib/schema";
import { requireAuth } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { status } = await request.json();

  if (!["going", "maybe", "not_going"].includes(status)) {
    return Response.json({ error: "Status must be going, maybe, or not_going" }, { status: 400 });
  }

  const event = db.select().from(events).where(eq(events.id, id)).get();
  if (!event) {
    return Response.json({ error: "Event not found" }, { status: 404 });
  }

  const existing = db
    .select()
    .from(eventResponses)
    .where(and(eq(eventResponses.eventId, id), eq(eventResponses.userId, user.id)))
    .get();

  if (existing) {
    if (existing.status === status) {
      db.delete(eventResponses).where(eq(eventResponses.id, existing.id)).run();
      return Response.json({ ok: true, status: null });
    }
    db.update(eventResponses)
      .set({ status, createdAt: new Date() })
      .where(eq(eventResponses.id, existing.id))
      .run();
  } else {
    db.insert(eventResponses)
      .values({
        id: nanoid(),
        eventId: id,
        userId: user.id,
        status,
        createdAt: new Date(),
      })
      .run();
  }

  return Response.json({ ok: true, status });
}
