"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";

interface Notification {
  id: string;
  type: string;
  eventId: string | null;
  message: string;
  read: number;
  createdAt: string;
  actorName: string;
}

interface NavBarProps {
  user: { id: string; displayName: string; role: string } | null;
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const seconds = Math.floor((now - then) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function NavBar({ user }: NavBarProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setNotifications(data);
      }
    } catch {}
  }, [user]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showDropdown]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  async function markAllRead() {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    await fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: unreadIds }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: 1 })));
  }

  async function handleNotificationClick(n: Notification) {
    if (!n.read) {
      await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [n.id] }),
      });
      setNotifications((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, read: 1 } : x))
      );
    }
    setShowDropdown(false);
    if (n.eventId) router.push(`/events/${n.eventId}`);
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <nav className="bg-white/80 backdrop-blur-sm border-b border-border sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-heading font-800 text-xl text-coral tracking-tight">
          Family Events
        </Link>

        {user && (
          <div className="flex items-center gap-1 sm:gap-4">
            {user.role === "admin" && (
              <Link
                href="/admin"
                className="text-sm text-text-secondary hover:text-text-primary transition-colors px-2 py-2 min-h-[44px] flex items-center"
              >
                Manage
              </Link>
            )}

            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="relative px-2 py-2 min-h-[44px] flex items-center text-text-secondary hover:text-text-primary transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-coral text-white text-[10px] rounded-full flex items-center justify-center font-700 leading-none">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {showDropdown && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl border border-border shadow-lg z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <span className="font-heading font-700 text-sm">Notifications</span>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="text-xs text-coral hover:text-coral-hover transition-colors">
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => handleNotificationClick(n)}
                        className={`w-full text-left px-4 py-3 hover:bg-bg-secondary transition text-sm border-b border-border/50 last:border-b-0 ${!n.read ? "bg-bg-accent" : ""}`}
                      >
                        <p className="text-text-primary">{n.message}</p>
                        <p className="text-xs text-text-secondary mt-0.5">{relativeTime(n.createdAt)}</p>
                      </button>
                    ))}
                    {notifications.length === 0 && (
                      <p className="px-4 py-6 text-center text-sm text-text-secondary">No notifications yet</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <Link
              href="/settings"
              className="text-sm text-text-secondary hover:text-text-primary transition-colors px-2 py-2 min-h-[44px] flex items-center"
            >
              <span className="hidden sm:inline">{user.displayName}</span>
              <span className="sm:hidden">Settings</span>
            </Link>
            <button
              onClick={handleLogout}
              className="text-sm text-text-secondary hover:text-coral transition-colors px-2 py-2 min-h-[44px] flex items-center"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
