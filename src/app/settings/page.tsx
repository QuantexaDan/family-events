"use client";

import { useState } from "react";
import { useToast } from "@/components/ToastProvider";

export default function SettingsPage() {
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast("New passwords don't match", "error");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/auth/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast("Password changed successfully");
    } else {
      toast(data.error || "Failed to change password", "error");
    }
  }

  return (
    <div className="max-w-sm mx-auto">
      <h1 className="font-heading font-800 text-2xl mb-6">Settings</h1>

      <div className="bg-white rounded-2xl border border-border p-6">
        <h2 className="font-heading font-700 text-lg mb-4">Change password</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="currentPassword" className="block text-sm font-600 mb-1.5">
              Current password
            </label>
            <input
              id="currentPassword"
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-bg-primary focus:outline-none focus:ring-2 focus:ring-coral/30 focus:border-coral transition"
            />
          </div>

          <div>
            <label htmlFor="newPassword" className="block text-sm font-600 mb-1.5">
              New password
            </label>
            <input
              id="newPassword"
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-bg-primary focus:outline-none focus:ring-2 focus:ring-coral/30 focus:border-coral transition"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-600 mb-1.5">
              Confirm new password
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-bg-primary focus:outline-none focus:ring-2 focus:ring-coral/30 focus:border-coral transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-coral text-white font-600 hover:bg-coral-hover transition disabled:opacity-50"
          >
            {loading ? "Changing..." : "Change password"}
          </button>
        </form>
      </div>
    </div>
  );
}
