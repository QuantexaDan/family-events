"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useToast } from "@/components/ToastProvider";
import RsvpButton from "@/components/RsvpButton";
import CommentThread from "@/components/CommentThread";
import PhotoGallery from "@/components/PhotoGallery";

interface RsvpPerson {
  userId: string;
  displayName: string;
}

interface EventDetail {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startDate: string;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  createdByName: string;
  category: { id: string; name: string; color: string } | null;
  rsvps: {
    going: RsvpPerson[];
    maybe: RsvpPerson[];
    notGoing: RsvpPerson[];
  };
  myRsvp: string | null;
  isOwner: boolean;
  isAdmin: boolean;
}

export default function EventDetailPage() {
  const router = useRouter();
  const { toast } = useToast();
  const params = useParams();
  const id = params.id as string;

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  function fetchEvent() {
    fetch(`/api/events/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setEvent(data);
      });
  }

  useEffect(fetchEvent, [id]);

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this event?")) return;
    setDeleting(true);
    const res = await fetch(`/api/events/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast("Event deleted");
      router.push("/");
      router.refresh();
    } else {
      toast("Failed to delete event", "error");
      setDeleting(false);
    }
  }

  function handleRsvpUpdate(newStatus: string | null) {
    fetchEvent();
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-text-secondary">{error}</p>
        <button onClick={() => router.push("/")} className="mt-4 text-coral hover:underline">
          Back to calendar
        </button>
      </div>
    );
  }

  if (!event) {
    return <p className="text-text-secondary">Loading...</p>;
  }

  const dateFormatted = new Date(event.startDate + "T12:00:00").toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const endDateFormatted = event.endDate
    ? new Date(event.endDate + "T12:00:00").toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push("/")}
          className="text-sm text-text-secondary hover:text-coral transition-colors mb-4 inline-block"
        >
          &larr; Back to calendar
        </button>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <h1 className="font-heading font-800 text-2xl">{event.title}</h1>
            {event.category && (
              <span
                className="text-xs px-2.5 py-1 rounded-full font-600 text-white"
                style={{ backgroundColor: event.category.color }}
              >
                {event.category.name}
              </span>
            )}
          </div>
          {event.isOwner && (
            <div className="flex gap-2">
              <button
                onClick={() => router.push(`/events/${id}/edit`)}
                className="text-sm text-text-secondary hover:text-coral transition-colors"
              >
                Edit
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-sm text-text-secondary hover:text-red-500 transition-colors"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Event info card */}
      <div className="bg-white rounded-2xl border border-border p-6 mb-6">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-sky mt-0.5">&#128197;</span>
            <div>
              <p className="font-600">{dateFormatted}</p>
              {endDateFormatted && (
                <p className="text-sm text-text-secondary">to {endDateFormatted}</p>
              )}
              {event.startTime && (
                <p className="text-sm text-text-secondary">
                  {event.startTime}
                  {event.endTime && ` – ${event.endTime}`}
                </p>
              )}
            </div>
          </div>

          {event.location && (
            <div className="flex items-start gap-3">
              <span className="text-coral mt-0.5">&#128205;</span>
              <p>{event.location}</p>
            </div>
          )}

          {event.description && (
            <div className="flex items-start gap-3">
              <span className="text-text-secondary mt-0.5">&#128221;</span>
              <p className="text-text-secondary whitespace-pre-wrap">{event.description}</p>
            </div>
          )}

          <p className="text-xs text-text-secondary pt-2">
            Created by {event.createdByName}
          </p>
        </div>
      </div>

      {/* RSVP */}
      <div className="bg-white rounded-2xl border border-border p-6 mb-6">
        <h2 className="font-heading font-700 text-lg mb-4">Are you going?</h2>
        <RsvpButton eventId={id} currentStatus={event.myRsvp} onUpdate={handleRsvpUpdate} />

        {/* Attendee lists */}
        <div className="mt-6 space-y-4">
          {event.rsvps.going.length > 0 && (
            <div>
              <h3 className="text-sm font-600 text-green-700 mb-1">
                Going ({event.rsvps.going.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {event.rsvps.going.map((p) => (
                  <span key={p.userId} className="text-sm bg-sage/20 text-green-800 px-3 py-1 rounded-full">
                    {p.displayName}
                  </span>
                ))}
              </div>
            </div>
          )}

          {event.rsvps.maybe.length > 0 && (
            <div>
              <h3 className="text-sm font-600 text-purple-700 mb-1">
                Maybe ({event.rsvps.maybe.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {event.rsvps.maybe.map((p) => (
                  <span key={p.userId} className="text-sm bg-lavender/20 text-purple-800 px-3 py-1 rounded-full">
                    {p.displayName}
                  </span>
                ))}
              </div>
            </div>
          )}

          {event.rsvps.notGoing.length > 0 && (
            <div>
              <h3 className="text-sm font-600 text-gray-500 mb-1">
                Can&apos;t make it ({event.rsvps.notGoing.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {event.rsvps.notGoing.map((p) => (
                  <span key={p.userId} className="text-sm bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
                    {p.displayName}
                  </span>
                ))}
              </div>
            </div>
          )}

          {event.rsvps.going.length === 0 && event.rsvps.maybe.length === 0 && event.rsvps.notGoing.length === 0 && (
            <p className="text-sm text-text-secondary">No responses yet. Be the first!</p>
          )}
        </div>
      </div>

      {/* Photos */}
      <div className="bg-white rounded-2xl border border-border p-6 mb-6">
        <h2 className="font-heading font-700 text-lg mb-4">Photos</h2>
        <PhotoGallery eventId={id} isAdmin={event.isAdmin} />
      </div>

      {/* Comments */}
      <div className="bg-white rounded-2xl border border-border p-6">
        <h2 className="font-heading font-700 text-lg mb-4">Discussion</h2>
        <CommentThread eventId={id} />
      </div>
    </div>
  );
}
