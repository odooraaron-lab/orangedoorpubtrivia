import "server-only";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { categories, files, playlists, type FileKind } from "@/db/schema";
import { directDownloadUrl, linkProblem, titleFromFileName } from "./format";
import { checkLink, type LinkCheck } from "./links";
import { MAX_PDFS } from "./game-files";

// These would clash with portal pages of the same name.
const RESERVED_GENRE_SLUGS = new Set(["search", "account"]);

export async function uniqueCategorySlug(base: string, exceptId?: string) {
  let slug = base;
  for (let i = 2; ; i++) {
    if (!RESERVED_GENRE_SLUGS.has(slug)) {
      const [hit] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(and(eq(categories.slug, slug), exceptId ? ne(categories.id, exceptId) : undefined))
        .limit(1);
      if (!hit) return slug;
    }
    slug = `${base}-${i}`;
  }
}

export async function uniquePlaylistSlug(categoryId: string, base: string, exceptId?: string) {
  let slug = base;
  for (let i = 2; ; i++) {
    const [hit] = await db
      .select({ id: playlists.id })
      .from(playlists)
      .where(
        and(
          eq(playlists.categoryId, categoryId),
          eq(playlists.slug, slug),
          exceptId ? ne(playlists.id, exceptId) : undefined,
        ),
      )
      .limit(1);
    if (!hit) return slug;
    slug = `${base}-${i}`;
  }
}

export type GameLinkRow = {
  /** The saved file this row was showing, if any (from the form). */
  id?: string;
  /** What customers see on the download button. Blank: taken from the file's name. */
  title: string;
  url: string;
};

export type GameLinksInput = {
  pdfs: GameLinkRow[];
  presentation: GameLinkRow | null;
};

export type GameLinksResult = { error?: string; warnings: string[] };

/**
 * Saves a game's Zoho (or other) links: any number of PDFs plus one PowerPoint. Rows left
 * empty are removed. New or changed links are checked so we can pick up the real file name
 * and size, and warn about common mistakes (a folder link, downloads switched off...).
 */
export async function applyGameLinks(game: { id: string; name: string }, input: GameLinksInput): Promise<GameLinksResult> {
  const existing = await db.select().from(files).where(eq(files.playlistId, game.id));
  const byId = new Map(existing.map((f) => [f.id, f]));

  type Plan = { kind: FileKind; label: string; row: GameLinkRow; current: (typeof existing)[number] | null; sortOrder: number };
  const pdfRows = input.pdfs.filter((r) => r.url.trim());
  if (pdfRows.length > MAX_PDFS) return { error: `A game can have up to ${MAX_PDFS} PDFs.`, warnings: [] };

  const plans: Plan[] = pdfRows.map((row, i) => ({
    kind: "pdf",
    label: row.title.trim() || `PDF ${i + 1}`,
    row: { ...row, url: row.url.trim(), title: row.title.trim() },
    current: row.id ? (byId.get(row.id) ?? null) : null,
    sortOrder: (i + 1) * 10,
  }));
  if (input.presentation?.url.trim()) {
    const row = input.presentation;
    plans.push({
      kind: "presentation",
      label: row.title.trim() || "PowerPoint",
      row: { ...row, url: row.url.trim(), title: row.title.trim() },
      current: row.id ? (byId.get(row.id) ?? null) : null,
      // The PowerPoint is listed first: it's the game itself.
      sortOrder: 0,
    });
  }

  const problems = plans.flatMap((p) => {
    const problem = linkProblem(p.row.url);
    return problem ? [`${p.label}: ${problem}`] : [];
  });
  if (problems.length) return { error: problems.join("\n"), warnings: [] };

  const needsCheck = (p: Plan) => !p.current || p.current.externalUrl !== p.row.url || !p.current.fileName;
  const checks: (LinkCheck | null)[] = await Promise.all(
    plans.map((p) => (needsCheck(p) ? checkLink(directDownloadUrl(p.row.url)) : Promise.resolve(null))),
  );

  const warnings: string[] = [];
  const keep = new Set<string>();
  for (const [i, p] of plans.entries()) {
    const check = checks[i];
    if (check && !check.reachable) {
      warnings.push(`${p.label}: we couldn't open this link to check it. Make sure it's an external share link with downloads allowed.`);
    } else if (check?.isHtml) {
      warnings.push(`${p.label}: this link opens a Zoho page instead of the file. Share the file itself (not its folder) and allow downloads.`);
    } else if (check && p.kind === "pdf" && !check.isPdf) {
      warnings.push(`${p.label}: this link doesn't seem to be a PDF.`);
    } else if (check && p.kind === "presentation" && !check.isPresentation) {
      warnings.push(`${p.label}: this link doesn't seem to be a PowerPoint (.pptx) file.`);
    }

    const sameLink = p.current?.externalUrl === p.row.url;
    const fileName = check?.fileName ?? (sameLink ? p.current?.fileName : "") ?? "";
    const values = {
      title:
        p.row.title ||
        (sameLink && p.current?.title) ||
        (fileName ? titleFromFileName(fileName) : p.kind === "presentation" ? `${game.name} – PowerPoint` : `${game.name} – PDF ${i + 1}`),
      kind: p.kind,
      externalUrl: p.row.url,
      fileName,
      sizeBytes: check?.size ?? (sameLink ? (p.current?.sizeBytes ?? null) : null),
      contentType: check?.contentType ?? (sameLink ? (p.current?.contentType ?? "") : ""),
      sortOrder: p.sortOrder,
    };
    if (p.current) {
      await db.update(files).set(values).where(eq(files.id, p.current.id));
      keep.add(p.current.id);
    } else {
      const [created] = await db.insert(files).values({ ...values, playlistId: game.id }).returning({ id: files.id });
      keep.add(created.id);
    }
  }

  // Anything no longer on the form (an emptied or removed row) is taken off the game.
  for (const f of existing) {
    if (!keep.has(f.id)) await db.delete(files).where(eq(files.id, f.id));
  }

  return { warnings };
}
