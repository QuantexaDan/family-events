import { NextRequest } from "next/server";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { comments, events, users } from "@/lib/schema";
import { requireAuth } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const event = db.select().from(events).where(eq(events.id, id)).get();
  if (!event) return Response.json({ error: "Event not found" }, { status: 404 });

  const allComments = db
    .select({
      id: comments.id,
      body: comments.body,
      createdAt: comments.createdAt,
      updatedAt: comments.updatedAt,
      userId: comments.userId,
      displayName: users.displayName,
    })
    .from(comments)
    .innerJoin(users, eq(comments.userId, users.id))
    .where(eq(comments.eventId, id))
    .orderBy(comments.createdAt)
    .all();

  return Response.json(allComments.map((c) => ({
    ...c,
    isOwn: c.userId === user.id,
  })));
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { body } = await request.json();

  if (!body || !body.trim()) {
    return Response.json({ error: "Comment cannot be empty" }, { status: 400 });
  }

  const event = db.select().from(events).where(eq(events.id, id)).get();
  if (!event) return Response.json({ error: "Event not found" }, { status: 404 });

  const commentId = nanoid();

  db.insert(comments).values({
    id: commentId,
    eventId: id,
    userId: user.id,
    body: body.trim(),
    createdAt: new Date(),
  }).run();

  return Response.json({ ok: true, id: commentId });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id: commentId, body } = await request.json();

  if (!commentId || !body || !body.trim()) {
    return Response.json({ error: "Comment ID and body are required" }, { status: 400 });
  }

  const comment = db.select().from(comments).where(eq(comments.id, commentId)).get();
  if (!comment) return Response.json({ error: "Comment not found" }, { status: 404 });

  if (comment.userId !== user.id) {
    return Response.json({ error: "You can only edit your own comments" }, { status: 403 });
  }

  db.update(comments)
    .set({ body: body.trim(), updatedAt: new Date() })
    .where(eq(comments.id, commentId))
    .run();

  return Response.json({ ok: true });
}
