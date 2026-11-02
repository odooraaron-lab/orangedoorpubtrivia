"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { eq, max } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { playlists } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { slugify } from "@/lib/format";
import { applyGameLinks, gamesCategoryId, uniquePlaylistSlug, type GameLinkRow } from "@/lib/library-admin";
import { fail, ok, type ActionResult } from "@/lib/action-result";

const uuid = z.uuid();
const text = (fd: FormData, key: string, maxLen = 200) =>
  String(fd.get(key) ?? "")
    .trim()
    .slice(0, maxLen);
const sortValue = (fd: FormData) => {
  const n = Number.parseInt(String(fd.get("sortOrder") ?? ""), 10);
  return Number.isFinite(n) ? Math.max(-100000, Math.min(100000, n)) : 0;
};

// ── Games ──────────────────────────────────────────────────────────────

export async function createPlaylist(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  await requireAdmin();
  const categoryId = await gamesCategoryId();
  const name = text(fd, "name", 120);
  if (!name) return fail("Give the game a name.");
  const [{ top }] = await db
    .select({ top: max(playlists.sortOrder) })
    .from(playlists)
    .where(eq(playlists.categoryId, categoryId));
  const [created] = await db
    .insert(playlists)
    .values({
      categoryId,
      name,
      slug: await uniquePlaylistSlug(categoryId, slugify(name)),
      description: text(fd, "description", 500),
      sortOrder: (top ?? 0) + 10,
      isPublished: fd.get("isPublished") === "on",
    })
    .returning({ id: playlists.id });
  redirect(`/admin/library/playlist/${created.id}`);
}

export async function updatePlaylist(id: string, _prev: ActionResult, fd: FormData): Promise<ActionResult> {
  await requireAdmin();
  if (!uuid.safeParse(id).success) return fail("Unknown game.");
  const name = text(fd, "name", 120);
  if (!name) return fail("Give the game a name.");
  const [current] = await db.select({ categoryId: playlists.categoryId }).from(playlists).where(eq(playlists.id, id)).limit(1);
  if (!current) return fail("Unknown game.");
  const slug = await uniquePlaylistSlug(current.categoryId, slugify(text(fd, "slug", 80) || name), id);
  await db
    .update(playlists)
    .set({
      name,
      slug,
      description: text(fd, "description", 500),
      sortOrder: sortValue(fd),
      isPublished: fd.get("isPublished") === "on",
    })
    .where(eq(playlists.id, id));
  refresh();
  return ok("Game saved.");
}

export async function deletePlaylist(id: string, _prev: ActionResult, _fd: FormData): Promise<ActionResult> {
  await requireAdmin();
  if (!uuid.safeParse(id).success) return fail("Unknown game.");
  const [playlist] = await db.select().from(playlists).where(eq(playlists.id, id)).limit(1);
  if (!playlist) return fail("Unknown game.");

  await db.delete(playlists).where(eq(playlists.id, id));
  redirect("/admin/library");
}

// ── Game files ─────────────────────────────────────────────────────────────

/**
 * Saves a game's links: the PDFs (any number of rows, each with an optional button name)
 * and the PowerPoint. A row left empty, or removed with its × button, takes that file off.
 */
export async function saveGameFiles(playlistId: string, _prev: ActionResult, fd: FormData): Promise<ActionResult> {
  await requireAdmin();
  if (!uuid.safeParse(playlistId).success) return fail("Unknown game.");
  const [game] = await db.select().from(playlists).where(eq(playlists.id, playlistId)).limit(1);
  if (!game) return fail("Unknown game.");

  const all = (key: string, maxLen: number) => fd.getAll(key).map((v) => String(v).trim().slice(0, maxLen));
  const ids = all("pdfId", 40);
  const titles = all("pdfTitle", 200);
  const urls = all("pdfUrl", 2000);
  const pdfs: GameLinkRow[] = urls.map((url, i) => ({
    id: uuid.safeParse(ids[i]).success ? ids[i] : undefined,
    title: titles[i] ?? "",
    url,
  }));
  const pptId = text(fd, "pptId", 40);
  const presentation: GameLinkRow = {
    id: uuid.safeParse(pptId).success ? pptId : undefined,
    title: text(fd, "pptTitle", 200),
    url: text(fd, "pptUrl", 2000),
  };

  const result = await applyGameLinks(game, { pdfs, presentation });
  if (result.error) return fail(result.error);
  refresh();
  return ok("Game files saved.", result.warnings.length ? result.warnings.join("\n") : undefined);
}
