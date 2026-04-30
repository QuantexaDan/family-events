import Database from "better-sqlite3";
import bcrypt from "bcrypt";
import { nanoid } from "nanoid";
import path from "path";

const dbPath = path.join(__dirname, "..", "data", "family-events.db");
const db = new Database(dbPath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
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
`);

async function seed() {
  const adminEmail = "dan@family-events.local";
  const adminPassword = "admin123";

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(adminEmail);
  if (existing) {
    console.log("Admin user already exists. Skipping.");
    return;
  }

  const passwordHash = await bcrypt.hash(adminPassword, 10);
  const adminId = nanoid();
  const now = Math.floor(Date.now() / 1000);

  db.prepare(
    "INSERT INTO users (id, email, display_name, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(adminId, adminEmail, "Dan", passwordHash, "admin", now);

  const inviteCode = nanoid(10);
  db.prepare(
    "INSERT INTO invites (id, code, created_by, created_at) VALUES (?, ?, ?, ?)"
  ).run(nanoid(), inviteCode, adminId, now);

  console.log("Admin user created:");
  console.log(`  Email:    ${adminEmail}`);
  console.log(`  Password: ${adminPassword}`);
  console.log(`  Role:     admin`);
  console.log("");
  console.log("First invite code created:");
  console.log(`  Code: ${inviteCode}`);
  console.log(`  Link: /join/${inviteCode}`);
  console.log("");
  console.log("Change the admin password after first login!");
}

seed().then(() => {
  db.close();
  console.log("Seed complete.");
});
