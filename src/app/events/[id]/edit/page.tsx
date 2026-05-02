"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useToast } from "@/components/ToastProvider";

interface Category {
  id: string;
  name: string;
  color: string;
}

export default function EditEventPage() {
  const router = useRouter();
  const { toast } = useToast();
  const params = useParams();
  const id = params.id as string;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const todayStr = new Date().toISOString().split("T")[0];

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setCategories(data); });
  }, []);

  useEffect(() => {
    fetch(`/api/events/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setTitle(data.title);
          setDescription(data.description ?? "");
          setLocation(data.location ?? "");
          setStartDate(data.startDate);
          setEndDate(data.endDate ?? "");
          setStartTime(data.startTime ?? "");
          setEndTime(data.endTime ?? "");
          setCategoryId(data.category?.id ?? "");
        }
        setFetching(false);
      });
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch(`/api/events/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, location, startDate, endDate, startTime, endTime, categoryId: categoryId || null }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error);
      return;
    }

    toast("Event updated");
    router.push(`/events/${id}`);
    router.refresh();
  }

  if (fetching) {
    return <p className="text-text-secondary">Loading...</p>;
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="font-heading font-800 text-2xl mb-6">Edit event</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>
        )}

        <div>
          <label htmlFor="title" className="block text-sm font-600 mb-1.5">Title</label>
          <input
            id="title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-coral/30 focus:border-coral transition"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-600 mb-1.5">Details (optional)</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-coral/30 focus:border-coral transition resize-none"
          />
        </div>

        <div>
          <label htmlFor="location" className="block text-sm font-600 mb-1.5">Where? (optional)</label>
          <input
            id="location"
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-coral/30 focus:border-coral transition"
          />
        </div>

        <div>
          <label htmlFor="category" className="block text-sm font-600 mb-1.5">Category (optional)</label>
          <select
            id="category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-coral/30 focus:border-coral transition"
          >
            <option value="">No category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
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
            {loading ? "Saving..." : "Save changes"}
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
