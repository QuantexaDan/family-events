"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useToast } from "@/components/ToastProvider";

export default function JoinPage() {
  const router = useRouter();
  const { toast } = useToast();
  const params = useParams();
  const code = params.code as string;

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, email, password, displayName }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error);
      return;
    }

    toast("Welcome to the family!");
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex-1 flex items-center justify-center -mt-8">
      <div className="w-full max-w-sm">
        <h1 className="font-heading font-800 text-3xl text-center mb-2">Join the family</h1>
        <p className="text-text-secondary text-center mb-8">Create your account to get started</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>
          )}

          <div>
            <label htmlFor="displayName" className="block text-sm font-600 mb-1.5">Your name</label>
            <input
              id="displayName"
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="How the family knows you"
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-coral/30 focus:border-coral transition"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-600 mb-1.5">Email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-coral/30 focus:border-coral transition"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-600 mb-1.5">Password</label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-coral/30 focus:border-coral transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-coral text-white font-600 hover:bg-coral-hover transition disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Join"}
          </button>
        </form>

        <p className="text-center text-sm text-text-secondary mt-6">
          Already have an account?{" "}
          <a href="/login" className="text-coral hover:underline">Sign in</a>
        </p>
      </div>
    </div>
  );
}
