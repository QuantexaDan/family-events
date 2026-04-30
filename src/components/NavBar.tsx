"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

interface NavBarProps {
  user: { displayName: string; role: string } | null;
}

export default function NavBar({ user }: NavBarProps) {
  const router = useRouter();

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
