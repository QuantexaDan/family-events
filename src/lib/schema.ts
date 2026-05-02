import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";

export const categories = sqliteTable("categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  color: text("color").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["admin", "member"] }).notNull().default("member"),
  avatarUrl: text("avatar_url"),
  lastLoginAt: integer("last_login_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const invites = sqliteTable("invites", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  email: text("email"),
  createdBy: text("created_by").notNull().references(() => users.id),
  usedBy: text("used_by").references(() => users.id),
  usedAt: integer("used_at", { mode: "timestamp" }),
  expiresAt: integer("expires_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const events = sqliteTable("events", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  location: text("location"),
  startDate: text("start_date").notNull(),
  endDate: text("end_date"),
  startTime: text("start_time"),
  endTime: text("end_time"),
  categoryId: text("category_id").references(() => categories.id),
  createdBy: text("created_by").notNull().references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const eventResponses = sqliteTable(
  "event_responses",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id),
    status: text("status", { enum: ["going", "maybe", "not_going"] }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [uniqueIndex("event_user_unique").on(table.eventId, table.userId)]
);

export const eventViews = sqliteTable(
  "event_views",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id),
    viewedAt: integer("viewed_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [uniqueIndex("event_view_unique").on(table.eventId, table.userId)]
);

export const comments = sqliteTable("comments", {
  id: text("id").primaryKey(),
  eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id),
  body: text("body").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
});

export const photos = sqliteTable("photos", {
  id: text("id").primaryKey(),
  eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  uploadedBy: text("uploaded_by").notNull().references(() => users.id),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  caption: text("caption"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
