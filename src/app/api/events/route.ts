import { NextRequest } from "next/server";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { events, eventResponses, users, categories, eventViews } from "@/lib/schema";
import { requireAuth } from "@/lib/auth";
import { eq, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const user = await requireAuth();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const month = request.nextUrl.searchParams.get("month");
  const year = request.nextUrl.searchParams.get("year");

  let allEvents;
  if (month && year) {
    const monthStr = month.padStart(2, "0");
    const startPrefix = `${year}-${monthStr}`;
    allEvents = db
      .select()
      .from(events)
      .where(sql`${events.startDate} LIKE ${startPrefix + "%"} OR ${events.endDate} LIKE ${startPrefix + "%"}`)
      .orderBy(events.startDate)
      .all();
  } else {
    allEvents = db.select().from(events).orderBy(events.startDate).all();
  }

  const eventsWithRsvps = allEvents.map((event) => {
    const responses = db
      .select({
        status: eventResponses.status,
        userId: eventResponses.userId,
        displayName: users.displayName,
      })
      .from(eventResponses)
      .innerJoin(users, eq(eventResponses.userId, users.id))
      .where(eq(eventResponses.eventId, event.id))
      .all();

    const myRsvp = responses.find((r) => r.userId === user.id);

    const viewed = db.select().from(eventViews)
      .where(sql`${eventViews.eventId} = ${event.id} AND ${eventViews.userId} = ${user.id}`)
      .get();
    const isNew = event.createdBy !== user.id && !viewed;

    const category = event.categoryId
      ? db.select().from(categories).where(eq(categories.id, event.categoryId)).get()
      : null;

    return {
      ...event,
      category: category ? { id: category.id, name: category.name, color: category.color } : null,
      rsvps: {
        going: responses.filter((r) => r.status === "going").map((r) => r.displayName),
        maybe: responses.filter((r) => r.status === "maybe").map((r) => r.displayName),
        notGoing: responses.filter((r) => r.status === "not_going").map((r) => r.displayName),
      },
      myRsvp: myRsvp?.status ?? null,
      isNew,
    };
  });

  return Response.json(eventsWithRsvps);
}

export async function POST(request: NextRequest) {
  const user = await requireAuth();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { title, description, location, startDate, endDate, startTime, endTime, categoryId } =
    await request.json();

  if (!title || !startDate) {
    return Response.json({ error: "Title and start date are required" }, { status: 400 });
  }

  const today = new Date().toISOString().split("T")[0];
  if (startDate < today) {
    return Response.json({ error: "Start date cannot be in the past" }, { status: 400 });
  }

  const id = nanoid();
  const now = new Date();

  db.insert(events)
    .values({
      id,
      title,
      description: description || null,
      location: location || null,
      startDate,
      endDate: endDate || null,
      startTime: startTime || null,
      endTime: endTime || null,
      categoryId: categoryId || null,
      createdBy: user.id,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  return Response.json({ ok: true, id });
}
