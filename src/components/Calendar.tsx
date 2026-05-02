"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface CalendarEvent {
  id: string;
  title: string;
  startDate: string;
  startTime: string | null;
  location: string | null;
  category: { id: string; name: string; color: string } | null;
  rsvps: { going: string[]; maybe: string[]; notGoing: string[] };
  myRsvp: string | null;
  isNew: boolean;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function Calendar() {
  const router = useRouter();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/events?month=${month + 1}&year=${year}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setEvents(data);
      });
  }, [month, year]);

  const firstDay = new Date(year, month, 1);
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const rowCount = cells.length / 7;

  function dateStr(day: number) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  function eventsOnDate(day: number) {
    const ds = dateStr(day);
    return events.filter((e) => e.startDate === ds);
  }

  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(year - 1); }
    else setMonth(month - 1);
    setSelectedDate(null);
  }

  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(year + 1); }
    else setMonth(month + 1);
    setSelectedDate(null);
  }

  const selectedEvents = selectedDate
    ? events.filter((e) => e.startDate === selectedDate)
    : [];

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="w-10 h-10 rounded-xl border border-border flex items-center justify-center hover:bg-bg-secondary transition text-text-secondary"
        >
          &larr;
        </button>
        <h2 className="font-heading font-700 text-xl">
          {MONTHS[month]} {year}
        </h2>
        <button
          onClick={nextMonth}
          className="w-10 h-10 rounded-xl border border-border flex items-center justify-center hover:bg-bg-secondary transition text-text-secondary"
        >
          &rarr;
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAYS.map((d) => (
          <div key={d} className="text-center text-xs font-600 text-text-secondary py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div
        className="grid grid-cols-7 gap-1 flex-1 min-h-0"
        style={{ gridTemplateRows: `repeat(${rowCount}, 1fr)` }}
      >
        {cells.map((day, i) => {
          if (day === null) {
            return (
              <div key={`empty-${i}`} />
            );
          }

          const dayEvents = eventsOnDate(day);
          const ds = dateStr(day);
          const selected = selectedDate === ds;

          return (
            <button
              key={day}
              onClick={() => setSelectedDate(selected ? null : ds)}
              className={`
                rounded-xl flex flex-col items-center justify-center relative transition-all min-h-0
                ${isToday(day) ? "bg-bg-accent font-700" : "hover:bg-bg-secondary"}
                ${selected ? "ring-2 ring-coral bg-white shadow-sm" : ""}
              `}
            >
              <span className={`text-sm ${isToday(day) ? "text-coral" : ""}`}>{day}</span>
              {dayEvents.length > 0 && (
                <div className="flex gap-0.5 mt-0.5">
                  {dayEvents.slice(0, 3).map((ev, j) => (
                    <span
                      key={j}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: ev.category?.color ?? "var(--coral)" }}
                    />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected date details */}
      {selectedDate && (
        <div className="mt-4 min-h-0 flex flex-col shrink-0 max-h-[40%] overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-heading font-700 text-lg">
              {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </h3>
            {selectedDate >= new Date().toISOString().split("T")[0] && (
              <button
                onClick={() => router.push(`/events/new?date=${selectedDate}`)}
                className="px-4 py-2 rounded-xl bg-coral text-white text-sm font-600 hover:bg-coral-hover transition"
              >
                + New event
              </button>
            )}
          </div>

          {selectedEvents.length === 0 ? (
            <div className="bg-white rounded-2xl border border-border p-6 text-center">
              <p className="text-text-secondary text-sm">No events on this day yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedEvents.map((event) => (
                <button
                  key={event.id}
                  onClick={() => router.push(`/events/${event.id}`)}
                  className="w-full text-left bg-white rounded-2xl border border-border p-4 hover:shadow-sm transition group"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-600 group-hover:text-coral transition-colors">
                          {event.title}
                        </h4>
                        {event.category && (
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-600 text-white"
                            style={{ backgroundColor: event.category.color }}
                          >
                            {event.category.name}
                          </span>
                        )}
                        {event.isNew && (
                          <span className="text-xs bg-amber/20 text-amber-700 px-2 py-0.5 rounded-full font-600">
                            New
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm text-text-secondary">
                        {event.startTime && <span>{event.startTime}</span>}
                        {event.location && <span>{event.location}</span>}
                      </div>
                    </div>
                    {event.rsvps.going.length > 0 && (
                      <span className="text-xs bg-sage/20 text-green-700 px-2 py-0.5 rounded-full">
                        {event.rsvps.going.length} going
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quick "create event" when no date selected */}
      {!selectedDate && (
        <div className="mt-4 text-center shrink-0">
          <button
            onClick={() => router.push("/events/new")}
            className="px-6 py-2.5 rounded-xl bg-coral text-white font-600 hover:bg-coral-hover transition"
          >
            + Create an event
          </button>
        </div>
      )}
    </div>
  );
}
