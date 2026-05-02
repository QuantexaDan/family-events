import { NextRequest } from "next/server";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { events, eventResponses, users, categories, eventViews } from "@/lib/schema";
import { requireAuth } from "@/lib/auth";
import { eq, sql } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const event = db.select().from(events).where(eq(events.id, id)).get();

  if (!event) {
    return Response.json({ error: "Event not found" }, { status: 404 });
  }

  // Record that this user has viewed this event
  const existingView = db.select().from(eventViews)
    .where(sql`${eventViews.eventId} = ${id} AND ${eventViews.userId} = ${user.id}`)
    .get();
  if (!existingView) {
    db.insert(eventViews).values({
      id: nanoid(),
      eventId: id,
      userId: user.id,
      viewedAt: new Date(),
    }).run();
  }

  const creator = db.select({ displayName: users.displayName }).from(users).where(eq(users.id, event.createdBy)).get();

  const category = event.categoryId
    ? db.select().from(categories).where(eq(categories.id, event.categoryId)).get()
    : null;

  const responses = db
    .select({
      status: eventResponses.status,
      userId: eventResponses.userId,
      displayName: users.displayName,
    })
    .from(eventResponses)
    .innerJoin(users, eq(eventResponses.userId, users.id))
    .where(eq(eventResponses.eventId, id))
    .all();

  const myRsvp = responses.find((r) => r.userId === user.id);

  return Response.json({
    ...event,
    createdByName: creator?.displayName ?? "Unknown",
    category: category ? { id: category.id, name: category.name, color: category.color } : null,
    rsvps: {
      going: responses.filter((r) => r.status === "going").map((r) => ({ userId: r.userId, displayName: r.displayName })),
      maybe: responses.filter((r) => r.status === "maybe").map((r) => ({ userId: r.userId, displayName: r.displayName })),
      notGoing: responses.filter((r) => r.status === "not_going").map((r) => ({ userId: r.userId, displayName: r.displayName })),
    },
    myRsvp: myRsvp?.status ?? null,
    isOwner: event.createdBy === user.id,
    isAdmin: user.role === "admin",
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const event = db.select().from(events).where(eq(events.id, id)).get();

  if (!event) {
    return Response.json({ error: "Event not found" }, { status: 404 });
  }

  if (event.createdBy !== user.id && user.role !== "admin") {
    return Response.json({ error: "Only the creator or admin can edit this event" }, { status: 403 });
  }

  const { title, description, location, startDate, endDate, startTime, endTime, categoryId } =
    await request.json();

  if (!title || !startDate) {
    return Response.json({ error: "Title and start date are required" }, { status: 400 });
  }

  const today = new Date().toISOString().split("T")[0];
  if (startDate < today) {
    return Response.json({ error: "Start date cannot be in the past" }, { status: 400 });
  }

  db.update(events)
    .set({
      title,
      description: description || null,
      location: location || null,
      startDate,
      endDate: endDate || null,
      startTime: startTime || null,
      endTime: endTime || null,
      categoryId: categoryId || null,
      updatedAt: new Date(),
    })
    .where(eq(events.id, id))
    .run();

  return Response.json({ ok: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const event = db.select().from(events).where(eq(events.id, id)).get();

  if (!event) {
    return Response.json({ error: "Event not found" }, { status: 404 });
  }

  if (event.createdBy !== user.id && user.role !== "admin") {
    return Response.json({ error: "Only the creator or admin can delete this event" }, { status: 403 });
  }

  db.delete(events).where(eq(events.id, id)).run();

  return Response.json({ ok: true });
}
