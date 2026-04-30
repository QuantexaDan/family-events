"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ToastProvider";

export default function NewEventPage() {
  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const prefillDate = searchParams.get("date") ?? "";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState(prefillDate);
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const todayStr = new Date().toISOString().split("T")[0];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, location, startDate, endDate, startTime, endTime }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error);
      return;
    }

    toast("Event created");
    router.push(`/events/${data.id}`);
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="font-heading font-800 text-2xl mb-6">Create an event</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>
        )}

        <div>
          <label htmlFor="title" className="block text-sm font-600 mb-1.5">
            What&apos;s the event?
          </label>
          <input
            id="title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Summer BBQ, Birthday dinner"
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-coral/30 focus:border-coral transition"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-600 mb-1.5">
            Details (optional)
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Any extra info the family should know..."
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-coral/30 focus:border-coral transition resize-none"
          />
        </div>

        <div>
          <label htmlFor="location" className="block text-sm font-600 mb-1.5">
            Where? (optional)
          </label>
          <input
            id="location"
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Mum's house, The Red Lion pub"
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-coral/30 focus:border-coral transition"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="startDate" className="block text-sm font-600 mb-1.5">Start date</label>
            <input
              id="startDate"
              type="date"
              required
              min={todayStr}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-coral/30 focus:border-coral transition"
            />
          </div>
          <div>
            <label htmlFor="endDate" className="block text-sm font-600 mb-1.5">End date (optional)</label>
            <input
              id="endDate"
              type="date"
              min={startDate || todayStr}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-coral/30 focus:border-coral transition"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="startTime" className="block text-sm font-600 mb-1.5">Start time (optional)</label>
            <input
              id="startTime"
              type="time"
              step="900"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-coral/30 focus:border-coral transition"
            />
          </div>
          <div>
            <label htmlFor="endTime" className="block text-sm font-600 mb-1.5">End time (optional)</label>
            <input
              id="endTime"
              type="time"
              step="900"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-coral/30 focus:border-coral transition"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-coral text-white font-600 hover:bg-coral-hover transition disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create event"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2.5 rounded-xl border border-border text-text-secondary font-600 hover:bg-bg-secondary transition"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
