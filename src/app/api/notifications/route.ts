import { db } from "@/lib/db";
import { notifications, users } from "@/lib/schema";
import { requireAuth } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const user = await requireAuth();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const results = db
    .select({
      id: notifications.id,
      type: notifications.type,
      eventId: notifications.eventId,
      message: notifications.message,
      read: notifications.read,
      createdAt: notifications.createdAt,
      actorName: users.displayName,
    })
    .from(notifications)
    .innerJoin(users, eq(notifications.actorId, users.id))
    .where(eq(notifications.userId, user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(20)
    .all();

  return Response.json(results);
}
