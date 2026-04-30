"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/ToastProvider";

interface Invite {
  id: string;
  code: string;
  email: string | null;
  usedBy: string | null;
  usedByName: string | null;
  createdAt: string;
}

interface Member {
  id: string;
  email: string;
  displayName: string;
  role: string;
  createdAt: string;
  isSelf: boolean;
}

type Tab = "invites" | "members";

export default function AdminPage() {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("members");
  const [invites, setInvites] = useState<Invite[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [email, setEmail] = useState("");
  const [newLink, setNewLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetPasswordFor, setResetPasswordFor] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");

  function fetchInvites() {
    fetch("/api/invites").then((r) => r.json()).then((data) => {
      if (Array.isArray(data)) setInvites(data);
    });
  }

  function fetchMembers() {
    fetch("/api/users").then((r) => r.json()).then((data) => {
      if (Array.isArray(data)) setMembers(data);
    });
  }

  useEffect(() => {
    fetchInvites();
    fetchMembers();
  }, []);

  async function createInvite(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setNewLink("");

    const res = await fetch("/api/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email || null }),
    });

    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      setNewLink(`${window.location.origin}${data.link}`);
      const sentTo = email;
      setEmail("");
      fetchInvites();
      toast(data.emailSent ? `Invite sent to ${sentTo}` : "Invite created");
    } else {
      toast(data.error || "Failed to create invite", "error");
    }
  }

  async function revokeInvite(id: string) {
    if (!confirm("Revoke this invite? It will no longer be usable.")) return;
    const res = await fetch(`/api/invites/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (res.ok) {
      fetchInvites();
      toast("Invite revoked");
    } else {
      toast(data.error || "Failed to revoke invite", "error");
    }
  }

  async function changeRole(userId: string, newRole: string) {
    const res = await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    const data = await res.json();
    if (res.ok) {
      fetchMembers();
      toast(`Role changed to ${newRole}`);
    } else {
      toast(data.error || "Failed to change role", "error");
    }
  }

  async function resetPassword(userId: string) {
    if (newPassword.length < 6) {
      toast("Password must be at least 6 characters", "error");
      return;
    }
    const res = await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPassword }),
    });
    const data = await res.json();
    if (res.ok) {
      setResetPasswordFor(null);
      setNewPassword("");
      toast("Password reset successfully");
    } else {
      toast(data.error || "Failed to reset password", "error");
    }
  }

  async function removeMember(userId: string, name: string) {
    if (!confirm(`Remove ${name}? This will delete their account and all their content.`)) return;
    const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
    const data = await res.json();
    if (res.ok) {
      fetchMembers();
      toast(`${name} has been removed`);
    } else {
      toast(data.error || "Failed to remove member", "error");
    }
  }

  return (
    <div>
      <h1 className="font-heading font-800 text-2xl mb-6">Admin</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-bg-secondary rounded-xl p-1 max-w-xs">
        <button
          onClick={() => setTab("members")}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-600 transition-all ${
            tab === "members" ? "bg-white shadow-sm text-text-primary" : "text-text-secondary hover:text-text-primary"
          }`}
        >
          Members
        </button>
        <button
          onClick={() => setTab("invites")}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-600 transition-all ${
            tab === "invites" ? "bg-white shadow-sm text-text-primary" : "text-text-secondary hover:text-text-primary"
          }`}
        >
          Invites
        </button>
      </div>

      {/* Members tab */}
      {tab === "members" && (
        <div className="bg-white rounded-2xl border border-border p-6 max-w-2xl">
          <h2 className="font-heading font-700 text-lg mb-4">
            Family members ({members.length})
          </h2>

          {members.length === 0 ? (
            <p className="text-text-secondary text-sm">Loading...</p>
          ) : (
            <div className="space-y-4">
              {members.map((member) => (
                <div key={member.id} className="flex flex-col sm:flex-row sm:items-center gap-3 py-3 border-b border-border last:border-0">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-bg-accent flex items-center justify-center text-sm font-700 text-coral shrink-0">
                      {member.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-600 truncate">{member.displayName}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          member.role === "admin"
                            ? "bg-amber/20 text-amber-700"
                            : "bg-bg-secondary text-text-secondary"
                        }`}>
                          {member.role}
                        </span>
                        {member.isSelf && (
                          <span className="text-xs text-text-secondary">(you)</span>
                        )}
                      </div>
                      <p className="text-xs text-text-secondary truncate">{member.email}</p>
                    </div>
                  </div>

                  {!member.isSelf && (
                    <div className="flex items-center gap-2 shrink-0 sm:ml-auto">
                      <button
                        onClick={() => changeRole(member.id, member.role === "admin" ? "member" : "admin")}
                        className="text-xs px-3 py-1.5 rounded-lg border border-border text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition"
                      >
                        Make {member.role === "admin" ? "member" : "admin"}
                      </button>
                      <button
                        onClick={() => {
                          setResetPasswordFor(resetPasswordFor === member.id ? null : member.id);
                          setNewPassword("");
                        }}
                        className="text-xs px-3 py-1.5 rounded-lg border border-border text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition"
                      >
                        Reset password
                      </button>
                      <button
                        onClick={() => removeMember(member.id, member.displayName)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-500 hover:text-red-700 hover:bg-red-50 transition"
                      >
                        Remove
                      </button>
                    </div>
                  )}

                  {/* Inline password reset */}
                  {resetPasswordFor === member.id && (
                    <div className="w-full flex gap-2 mt-1">
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="New password (min 6 chars)"
                        className="flex-1 px-3 py-2 rounded-lg border border-border bg-bg-primary text-sm focus:outline-none focus:ring-2 focus:ring-coral/30 focus:border-coral transition"
                      />
                      <button
                        onClick={() => resetPassword(member.id)}
                        className="px-4 py-2 rounded-lg bg-coral text-white text-sm font-600 hover:bg-coral-hover transition"
                      >
                        Set
                      </button>
                      <button
                        onClick={() => { setResetPasswordFor(null); setNewPassword(""); }}
                        className="px-3 py-2 rounded-lg border border-border text-text-secondary text-sm hover:bg-bg-secondary transition"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Invites tab */}
      {tab === "invites" && (
        <div className="space-y-8 max-w-2xl">
          {/* Create invite */}
          <div className="bg-white rounded-2xl border border-border p-6">
            <h2 className="font-heading font-700 text-lg mb-4">Create an invite</h2>
            <form onSubmit={createInvite} className="space-y-4">
              <div>
                <label htmlFor="invite-email" className="block text-sm font-600 mb-1.5">
                  Email (optional — leave blank for an open invite)
                </label>
                <input
                  id="invite-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="family.member@email.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-bg-primary focus:outline-none focus:ring-2 focus:ring-coral/30 focus:border-coral transition"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-coral text-white font-600 hover:bg-coral-hover transition disabled:opacity-50"
              >
                {loading ? "Creating..." : "Create invite"}
              </button>
            </form>

            {newLink && (
              <div className="mt-4 p-4 bg-bg-accent rounded-xl">
                <p className="text-sm font-600 mb-1">Share this link:</p>
                <code className="text-sm text-coral break-all">{newLink}</code>
              </div>
            )}
          </div>

          {/* Invite list */}
          <div className="bg-white rounded-2xl border border-border p-6">
            <h2 className="font-heading font-700 text-lg mb-4">Sent invites</h2>
            {invites.length === 0 ? (
              <p className="text-text-secondary text-sm">No invites yet.</p>
            ) : (
              <ul className="space-y-3">
                {invites.map((invite) => (
                  <li key={invite.id} className="flex items-center justify-between text-sm gap-3">
                    <div className="min-w-0">
                      <span className="font-mono text-xs text-text-secondary">{invite.code}</span>
                      {invite.email && (
                        <span className="ml-2 text-text-secondary">for {invite.email}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {invite.usedBy ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-sage/20 text-green-700">
                          Used by {invite.usedByName || "someone"}
                        </span>
                      ) : (
                        <>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber/20 text-amber-700">
                            Pending
                          </span>
                          <button
                            onClick={() => revokeInvite(invite.id)}
                            className="text-xs text-red-400 hover:text-red-600 transition-colors"
                          >
                            Revoke
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
