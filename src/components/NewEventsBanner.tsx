"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface NewEvent {
  id: string;
  title: string;
  startDate: string;
  location: string | null;
}

interface NewEventsBannerProps {
  events: NewEvent[];
}

export default function NewEventsBanner({ events }: NewEventsBannerProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);

  if (events.length === 0) return null;

  function handleClick() {
    if (events.length === 1) {
      router.push(`/events/${events[0].id}`);
    } else {
      setExpanded(!expanded);
    }
  }

  return (
    <div className="mb-6">
      <button
        onClick={handleClick}
        className="w-full bg-amber/10 border border-amber/30 rounded-xl px-4 py-3 text-sm text-amber-800 text-left hover:bg-amber/15 transition-colors cursor-pointer flex items-center justify-between"
      >
        <span>
          {events.length === 1
            ? "1 new event you haven’t seen yet"
            : `${events.length} new events you haven’t seen yet`}
        </span>
        {events.length === 1 ? (
          <span className="text-amber-600">&rarr;</span>
        ) : (
          <span className={`text-amber-600 transition-transform ${expanded ? "rotate-180" : ""}`}>
            &#9662;
          </span>
        )}
      </button>

      {expanded && events.length > 1 && (
        <div className="mt-2 space-y-2">
          {events.map((event) => (
            <button
              key={event.id}
              onClick={() => router.push(`/events/${event.id}`)}
              className="w-full text-left bg-white rounded-xl border border-border px-4 py-3 hover:shadow-sm transition group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-600 text-sm group-hover:text-coral transition-colors">
                    {event.title}
                  </h4>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-text-secondary">
                    <span>
                      {new Date(event.startDate + "T12:00:00").toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                    {event.location && <span>{event.location}</span>}
                  </div>
                </div>
                <span className="text-text-secondary group-hover:text-coral transition-colors">&rarr;</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
