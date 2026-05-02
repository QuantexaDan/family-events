import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";

const dbPath = path.join(process.cwd(), "data", "family-events.db");

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });

export function initDb() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      avatar_url TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS invites (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      email TEXT,
      created_by TEXT NOT NULL REFERENCES users(id),
      used_by TEXT REFERENCES users(id),
      used_at INTEGER,
      expires_at INTEGER,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      location TEXT,
      start_date TEXT NOT NULL,
      end_date TEXT,
      start_time TEXT,
      end_time TEXT,
      created_by TEXT NOT NULL REFERENCES users(id),
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS event_responses (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id),
      status TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS event_user_unique ON event_responses(event_id, user_id);

    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id),
      body TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS photos (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      uploaded_by TEXT NOT NULL REFERENCES users(id),
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      caption TEXT,
      created_at INTEGER NOT NULL
    );
  `);

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS event_views (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id),
      viewed_at INTEGER NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS event_view_unique ON event_views(event_id, user_id);
  `);

  // Migrations
  try { sqlite.exec("ALTER TABLE users ADD COLUMN last_login_at INTEGER"); } catch {}
  try { sqlite.exec("ALTER TABLE events ADD COLUMN category_id TEXT REFERENCES categories(id)"); } catch {}
  try { sqlite.exec("ALTER TABLE comments ADD COLUMN updated_at INTEGER"); } catch {}

  // Seed default categories
  const categoryCount = sqlite.prepare("SELECT COUNT(*) as count FROM categories").get() as { count: number };
  if (categoryCount.count === 0) {
    const now = Math.floor(Date.now() / 1000);
    const stmt = sqlite.prepare("INSERT INTO categories (id, name, color, created_at) VALUES (?, ?, ?, ?)");
    const defaults = [
      ["cat_birthday", "Birthday", "#EC4899", now],
      ["cat_business", "Business trip", "#6B7280", now],
      ["cat_concert", "Concert", "#8B5CF6", now],
      ["cat_dinner", "Dinner", "#F59E0B", now],
      ["cat_funtrip", "Fun trip", "#10B981", now],
      ["cat_vacation", "Vacation", "#3B82F6", now],
    ];
    for (const [id, name, color, ts] of defaults) {
      stmt.run(id, name, color, ts);
    }
  }
}
