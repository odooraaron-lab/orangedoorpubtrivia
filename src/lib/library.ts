import "server-only";
import { and, asc, eq, inArray, max, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { accessGrants, downloads, files, playlists } from "@/db/schema";
import { accessHasExpired } from "./auth";
import type { SessionUser } from "./session";

type Scope = { all: true } | { all: false; categoryIds: Set<string>; playlistIds: Set<string> };

async function getScope(user: SessionUser): Promise<Scope> {
  if (user.role === "admin" || user.accessAll) return { all: true };
  const grants = await db
    .select({ categoryId: accessGrants.categoryId, playlistId: accessGrants.playlistId })
    .from(accessGrants)
    .where(eq(accessGrants.userId, user.id));
  return {
    all: false,
    categoryIds: new Set(grants.flatMap((g) => (g.categoryId ? [g.categoryId] : []))),
    playlistIds: new Set(grants.flatMap((g) => (g.playlistId ? [g.playlistId] : []))),
  };
}

function canSeePlaylist(scope: Scope, p: { id: string; categoryId: string }) {
  return scope.all || scope.categoryIds.has(p.categoryId) || scope.playlistIds.has(p.id);
}

const isAdmin = (u: SessionUser) => u.role === "admin";

/** Admins also see hidden (unpublished) items so they can check them before release. */
function publishedOnly<T extends { isPublished: typeof playlists.isPublished }>(
  user: SessionUser,
  table: T,
): SQL | undefined {
  return isAdmin(user) ? undefined : eq(table.isPublished, true);
}

export type GameSummary = {
  id: string;
  slug: string;
  name: string;
  description: string;
  isPublished: boolean;
  fileCount: number;
  totalBytes: number;
  updatedAt: Date | null;
};

/** The games this customer can download, in the admin's order. Expired accounts get none. */
export async function listGames(user: SessionUser): Promise<GameSummary[]> {
  if (accessHasExpired(user)) return [];
  const scope = await getScope(user);
  const rows = await db
    .select({
      id: playlists.id,
      categoryId: playlists.categoryId,
      slug: playlists.slug,
      name: playlists.name,
      description: playlists.description,
      isPublished: playlists.isPublished,
      fileCount: sql<number>`count(${files.id})::int`,
      totalBytes: sql<number>`coalesce(sum(${files.sizeBytes}), 0)::float8`,
      updatedAt: max(files.createdAt),
    })
    .from(playlists)
    .leftJoin(files, eq(files.playlistId, playlists.id))
    .where(publishedOnly(user, playlists))
    .groupBy(playlists.id)
    .orderBy(asc(playlists.sortOrder), asc(playlists.name));
  return rows.filter((p) => canSeePlaylist(scope, p)).map(({ categoryId: _c, ...p }) => p);
}

/** One game and its files, if this customer may download it right now. */
export async function getGame(user: SessionUser, slug: string) {
  if (accessHasExpired(user)) return null;
  const [game] = await db
    .select()
    .from(playlists)
    .where(and(eq(playlists.slug, slug), publishedOnly(user, playlists)))
    .orderBy(asc(playlists.createdAt))
    .limit(1);
  if (!game) return null;

  const scope = await getScope(user);
  if (!canSeePlaylist(scope, game)) return null;

  const items = await db
    .select({
      id: files.id,
      title: files.title,
      kind: files.kind,
      fileName: files.fileName,
      sizeBytes: files.sizeBytes,
      createdAt: files.createdAt,
    })
    .from(files)
    .where(eq(files.playlistId, game.id))
    .orderBy(asc(files.sortOrder), asc(files.title));

  return { game, files: items };
}

/** Returns the file if this user may download it right now. */
export async function getDownloadableFile(user: SessionUser, fileId: string) {
  if (accessHasExpired(user)) return null;
  const [row] = await db
    .select({ file: files, playlistId: playlists.id, categoryId: playlists.categoryId })
    .from(files)
    .innerJoin(playlists, eq(files.playlistId, playlists.id))
    .where(and(eq(files.id, fileId), publishedOnly(user, playlists)))
    .limit(1);
  if (!row) return null;
  const scope = await getScope(user);
  if (!canSeePlaylist(scope, { id: row.playlistId, categoryId: row.categoryId })) return null;
  return row.file;
}

/**
 * When this user last downloaded anything from each of these games: game id → date.
 */
export async function downloadedGames(userId: string, playlistIds: string[]) {
  if (playlistIds.length === 0) return new Map<string, Date>();
  const rows = await db
    .select({ playlistId: files.playlistId, at: max(downloads.createdAt) })
    .from(downloads)
    .innerJoin(files, eq(files.id, downloads.fileId))
    .where(and(eq(downloads.userId, userId), inArray(files.playlistId, playlistIds)))
    .groupBy(files.playlistId);
  return new Map(rows.flatMap((r) => (r.at ? [[r.playlistId, r.at] as const] : [])));
}

/** When this user last downloaded each file of a game: file id → date. */
export async function downloadedFiles(userId: string, playlistId: string) {
  const rows = await db
    .select({ fileId: downloads.fileId, at: max(downloads.createdAt) })
    .from(downloads)
    .innerJoin(files, eq(files.id, downloads.fileId))
    .where(and(eq(downloads.userId, userId), eq(files.playlistId, playlistId)))
    .groupBy(downloads.fileId);
  return new Map(rows.flatMap((r) => (r.at ? [[r.fileId, r.at] as const] : [])));
}
