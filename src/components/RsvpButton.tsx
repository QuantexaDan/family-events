"use client";

import { useToast } from "@/components/ToastProvider";

interface RsvpButtonProps {
  eventId: string;
  currentStatus: string | null;
  onUpdate: (newStatus: string | null) => void;
}

const OPTIONS = [
  { value: "going", label: "Going", activeClass: "bg-sage text-green-900", inactiveClass: "border-sage/50 text-green-700 hover:bg-sage/10" },
  { value: "maybe", label: "Maybe", activeClass: "bg-lavender text-purple-900", inactiveClass: "border-lavender/50 text-purple-700 hover:bg-lavender/10" },
  { value: "not_going", label: "Can't make it", activeClass: "bg-gray-200 text-gray-700", inactiveClass: "border-gray-200 text-gray-500 hover:bg-gray-50" },
] as const;

const LABELS: Record<string, string> = { going: "Going", maybe: "Maybe", not_going: "Can't make it" };

export default function RsvpButton({ eventId, currentStatus, onUpdate }: RsvpButtonProps) {
  const { toast } = useToast();

  async function handleClick(status: string) {
    const res = await fetch(`/api/events/${eventId}/rsvp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    const data = await res.json();
    if (res.ok) {
      onUpdate(data.status);
      toast(`RSVP updated to "${LABELS[data.status] || data.status}"`);
    } else {
      toast(data.error || "Failed to update RSVP", "error");
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => handleClick(opt.value)}
          className={`
            px-4 py-2 rounded-full text-sm font-600 transition-all
            ${currentStatus === opt.value
              ? opt.activeClass
              : `border ${opt.inactiveClass}`
            }
          `}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
