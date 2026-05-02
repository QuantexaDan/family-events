import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { events, eventViews } from "@/lib/schema";
import { sql } from "drizzle-orm";
import Calendar from "@/components/Calendar";
import NewEventsBanner from "@/components/NewEventsBanner";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const newEvents = db
    .select({
      id: events.id,
      title: events.title,
      startDate: events.startDate,
      location: events.location,
    })
    .from(events)
    .where(sql`${events.createdBy} != ${user.id} AND ${events.id} NOT IN (SELECT event_id FROM event_views WHERE user_id = ${user.id})`)
    .orderBy(events.startDate)
    .all();

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <h1 className="font-heading font-800 text-2xl mb-2">
        Hi {user.displayName.split(" ")[0]}!
      </h1>
      <p className="text-text-secondary mb-4">Here&apos;s what the family has coming up.</p>

      <NewEventsBanner events={newEvents} />

      <div className="bg-white rounded-2xl border border-border p-6 flex-1 min-h-0 flex flex-col">
        <Calendar />
      </div>
    </div>
  );
}
