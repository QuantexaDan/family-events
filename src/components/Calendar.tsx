"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface CalendarEvent {
  id: string;
  title: string;
  startDate: string;
  endDate: string | null;
  startTime: string | null;
  location: string | null;
  category: { id: string; name: string; color: string } | null;
  rsvps: { going: string[]; maybe: string[]; notGoing: string[] };
  myRsvp: string | null;
  isNew: boolean;
}

interface EventSegment {
  event: CalendarEvent;
  startCol: number;
  span: number;
  row: number;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a + "T12:00:00");
  const db = new Date(b + "T12:00:00");
  return Math.round((db.getTime() - da.getTime()) / (86400000));
}

function isMultiDay(e: CalendarEvent): boolean {
  return !!e.endDate && e.endDate !== e.startDate;
}

function computeWeekSegments(
  weekStart: string,
  weekEnd: string,
  events: CalendarEvent[]
): EventSegment[] {
  const multiDayEvents = events.filter(
    (e) => isMultiDay(e) && e.startDate <= weekEnd && (e.endDate ?? e.startDate) >= weekStart
  );

  const segments: EventSegment[] = [];
  for (const event of multiDayEvents) {
    const startCol = Math.max(0, daysBetween(weekStart, event.startDate));
    const endCol = Math.min(6, daysBetween(weekStart, event.endDate ?? event.startDate));
    const span = endCol - startCol + 1;
    if (span <= 0) continue;

    let row = 0;
    while (true) {
      const conflict = segments.some(
        (s) => s.row === row && !(s.startCol + s.span <= startCol || s.startCol >= startCol + span)
      );
      if (!conflict) break;
      row++;
    }

    segments.push({ event, startCol, span, row });
  }

  return segments;
}

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

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  const gridStartDate = new Date(year, month, 1 - startDow);

  function cellDate(weekIndex: number, colIndex: number): string {
    const d = new Date(gridStartDate);
    d.setDate(d.getDate() + weekIndex * 7 + colIndex);
    return toDateStr(d);
  }

  function dateStr(day: number) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  function singleDayEventsOnDate(day: number) {
    const ds = dateStr(day);
    return events.filter((e) => !isMultiDay(e) && e.startDate === ds);
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
    ? events.filter((e) => {
        const end = e.endDate ?? e.startDate;
        return e.startDate <= selectedDate && end >= selectedDate;
      })
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

      {/* Calendar grid — week by week */}
      <div className="flex flex-col flex-1 min-h-0 gap-0.5">
        {weeks.map((week, weekIndex) => {
          const weekStart = cellDate(weekIndex, 0);
          const weekEnd = cellDate(weekIndex, 6);
          const segments = computeWeekSegments(weekStart, weekEnd, events);
          const maxRow = segments.length > 0 ? Math.max(...segments.map((s) => s.row)) + 1 : 0;
          const totalRows = 1 + maxRow;
          const rowTemplate = maxRow > 0
            ? `1fr ${Array(maxRow).fill("10px").join(" ")}`
            : "1fr";

          return (
            <div
              key={weekIndex}
              className="grid grid-cols-7 gap-x-1 gap-y-1.5 flex-1 min-h-0"
              style={{ gridTemplateRows: rowTemplate }}
            >
              {/* Day cells — all in row 1 */}
              {week.map((day, colIndex) => {
                if (day === null) {
                  return <div key={`empty-${weekIndex}-${colIndex}`} style={{ gridRow: 1, gridColumn: colIndex + 1 }} />;
                }

                const dayEvents = singleDayEventsOnDate(day);
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
                    style={{ gridRow: 1, gridColumn: colIndex + 1 }}
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

              {/* Multi-day event bars — in rows 2+ */}
              {segments.map((seg) => {
                const continuesFromPrev = seg.event.startDate < weekStart;
                const continuesIntoNext = (seg.event.endDate ?? seg.event.startDate) > weekEnd;
                return (
                  <button
                    key={`${seg.event.id}-${weekIndex}`}
                    className={`
                      px-1.5 text-[9px] font-600 text-white truncate cursor-pointer hover:opacity-80 transition leading-[10px]
                      ${continuesFromPrev ? "rounded-l-none" : "rounded-l-full"}
                      ${continuesIntoNext ? "rounded-r-none" : "rounded-r-full"}
                    `}
                    style={{
                      backgroundColor: seg.event.category?.color ?? "var(--coral)",
                      gridColumn: `${seg.startCol + 1} / span ${seg.span}`,
                      gridRow: seg.row + 2,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/events/${seg.event.id}`);
                    }}
                  >
                    {!continuesFromPrev && seg.event.title}
                  </button>
                );
              })}
            </div>
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
