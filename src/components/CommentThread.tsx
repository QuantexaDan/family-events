"use client";

import { useState, useEffect, useRef } from "react";
import { useToast } from "@/components/ToastProvider";

interface Comment {
  id: string;
  body: string;
  createdAt: string;
  displayName: string;
  isOwn: boolean;
}

interface CommentThreadProps {
  eventId: string;
}

function timeAgo(dateStr: string) {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function CommentThread({ eventId }: CommentThreadProps) {
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  function fetchComments() {
    fetch(`/api/events/${eventId}/comments`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setComments(data);
      });
  }

  useEffect(fetchComments, [eventId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments.length]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || sending) return;

    setSending(true);
    const res = await fetch(`/api/events/${eventId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });

    if (res.ok) {
      setBody("");
      fetchComments();
      toast("Comment posted");
    } else {
      toast("Failed to post comment", "error");
    }
    setSending(false);
  }

  return (
    <div>
      {comments.length === 0 ? (
        <p className="text-sm text-text-secondary text-center py-4">
          No comments yet. Start the conversation!
        </p>
      ) : (
        <div className="space-y-4 mb-4 max-h-96 overflow-y-auto pr-1">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-bg-accent flex items-center justify-center text-sm font-700 text-coral shrink-0">
                {comment.displayName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-600">{comment.displayName}</span>
                  <span className="text-xs text-text-secondary">{timeAgo(comment.createdAt)}</span>
                </div>
                <p className="text-sm mt-0.5 whitespace-pre-wrap break-words">{comment.body}</p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2 mt-4">
        <input
          type="text"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a comment..."
          className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-bg-primary focus:outline-none focus:ring-2 focus:ring-coral/30 focus:border-coral transition text-sm"
        />
        <button
          type="submit"
          disabled={!body.trim() || sending}
          className="px-5 py-2.5 rounded-xl bg-coral text-white text-sm font-600 hover:bg-coral-hover transition disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
