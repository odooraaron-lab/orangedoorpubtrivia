import {
  bigint,
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
};

export const userRole = pgEnum("user_role", ["admin", "member"]);

/** A game's files: printable PDFs (answer sheets, host notes...) and the PowerPoint that runs the quiz. */
export const fileKind = pgEnum("file_kind", ["pdf", "presentation", "other"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull().default(""),
  venue: text("venue").notNull().default(""),
  phone: text("phone").notNull().default(""),
  // Null until the customer sets a password from an invite link.
  passwordHash: text("password_hash"),
  role: userRole("role").notNull().default("member"),
  isActive: boolean("is_active").notNull().default(true),
  accessAll: boolean("access_all").notNull().default(false),
  accessExpiresAt: timestamp("access_expires_at", { withTimezone: true }),
  notes: text("notes").notNull().default(""),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  ...timestamps,
});

export const sessions = pgTable(
  "sessions",
  {
    // SHA-256 of the cookie token. The raw token is never stored.
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    userAgent: text("user_agent").notNull().default(""),
    ...timestamps,
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const passwordTokens = pgTable(
  "password_tokens",
  {
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    purpose: text("purpose", { enum: ["reset", "invite"] }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("password_tokens_user_idx").on(t.userId)],
);

export const authAttempts = pgTable(
  "auth_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    ip: text("ip").notNull().default(""),
    success: boolean("success").notNull(),
    ...timestamps,
  },
  (t) => [index("auth_attempts_email_idx").on(t.email, t.createdAt), index("auth_attempts_ip_idx").on(t.ip, t.createdAt)],
);

/** Top level of the library, e.g. "Weekly Trivia", "Themed Nights". */
export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  isPublished: boolean("is_published").notNull().default(true),
  ...timestamps,
});

/** Second level: one trivia game inside a category (table name kept from the bingo portal). */
export const playlists = pgTable(
  "playlists",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
    isPublished: boolean("is_published").notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex("playlists_category_slug_idx").on(t.categoryId, t.slug)],
);

/** A downloadable file in a game: a PDF or the PowerPoint, linked from Zoho WorkDrive. */
export const files = pgTable(
  "files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    playlistId: uuid("playlist_id")
      .notNull()
      .references(() => playlists.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    kind: fileKind("kind").notNull().default("pdf"),
    externalUrl: text("external_url").notNull(),
    fileName: text("file_name").notNull().default(""),
    sizeBytes: bigint("size_bytes", { mode: "number" }),
    contentType: text("content_type").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (t) => [index("files_playlist_idx").on(t.playlistId)],
);

/**
 * Gives a customer access to a whole category (categoryId set) or a single
 * game (playlistId set). Users with accessAll ignore grants.
 */
export const accessGrants = pgTable(
  "access_grants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "cascade" }),
    playlistId: uuid("playlist_id").references(() => playlists.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (t) => [index("access_grants_user_idx").on(t.userId)],
);

export const downloads = pgTable(
  "downloads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    fileId: uuid("file_id")
      .notNull()
      .references(() => files.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (t) => [index("downloads_user_idx").on(t.userId), index("downloads_file_idx").on(t.fileId)],
);

export type User = typeof users.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Playlist = typeof playlists.$inferSelect;
export type LibraryFile = typeof files.$inferSelect;
export type FileKind = (typeof fileKind.enumValues)[number];

export const activityKind = pgEnum("activity_kind", [
  "downloaded",
  "login",
  "login_failed",
  "show_viewed",
  "searched",
  "category_requested",
  "password_changed",
  "password_reset",
]);
export type ActivityKind = (typeof activityKind.enumValues)[number];

/**
 * What a customer has done on the site, for their page in the admin. Names are copied in
 * (`detail`), so the history still reads right after a game or file is renamed or deleted.
 */
export const activity = pgTable(
  "activity",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: activityKind("kind").notNull(),
    playlistId: uuid("playlist_id").references(() => playlists.id, { onDelete: "set null" }),
    fileId: uuid("file_id").references(() => files.id, { onDelete: "set null" }),
    // The game's name, the file's title, the words searched for, the category asked for…
    detail: text("detail").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("activity_user_idx").on(t.userId, t.createdAt), index("activity_user_kind_idx").on(t.userId, t.kind, t.createdAt)],
);
