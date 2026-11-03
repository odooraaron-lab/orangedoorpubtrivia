import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { files, playlists } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { formatBytes, formatDate, kindLabel } from "@/lib/format";
import { ActionForm } from "@/components/admin/action-form";
import { Breadcrumbs } from "@/components/portal/breadcrumbs";
import { FileIcon } from "@/components/portal/file-icon";
import { deletePlaylist, saveGameFiles, updatePlaylist } from "../../actions";
import { MAX_PDFS, splitGameFiles } from "@/lib/game-files";
import { GameFilesEditor } from "./game-files";

export const metadata: Metadata = { title: "Game" };

/** The arrow to the previous or next game (greyed out at either end). */
function ShowStep({ show, direction }: { show: { id: string; name: string } | null; direction: "prev" | "next" }) {
  const Icon = direction === "prev" ? ChevronLeft : ChevronRight;
  const word = direction === "prev" ? "Previous" : "Next";
  if (!show) {
    return (
      <span aria-hidden className="btn btn-ghost btn-sm pointer-events-none px-2 opacity-35">
        <Icon size={18} />
      </span>
    );
  }
  return (
    <Link
      href={`/admin/library/playlist/${show.id}`}
      className="btn btn-ghost btn-sm gap-1 px-2"
      title={`${word} game: ${show.name}`}
      aria-label={`${word} game: ${show.name}`}
    >
      {direction === "prev" && <Icon size={18} aria-hidden />}
      <span className="max-w-[9rem] truncate max-sm:hidden">{show.name}</span>
      {direction === "next" && <Icon size={18} aria-hidden />}
    </Link>
  );
}

export default async function PlaylistAdminPage({ params }: { params: Promise<{ playlistId: string }> }) {
  await requireAdmin();
  const { playlistId } = await params;
  if (!z.uuid().safeParse(playlistId).success) notFound();

  const [playlist] = await db.select().from(playlists).where(eq(playlists.id, playlistId)).limit(1);
  if (!playlist) notFound();

  const [items, siblings] = await Promise.all([
    db.select().from(files).where(eq(files.playlistId, playlistId)).orderBy(asc(files.sortOrder), asc(files.title)),
    // All games, in the same order as the list, for the previous / next arrows.
    db.select({ id: playlists.id, name: playlists.name }).from(playlists).orderBy(asc(playlists.sortOrder), asc(playlists.name)),
  ]);
  const at = siblings.findIndex((p) => p.id === playlist.id);
  const prev = at > 0 ? siblings[at - 1] : null;
  const next = at >= 0 && at < siblings.length - 1 ? siblings[at + 1] : null;
  const totalBytes = items.reduce((sum, f) => sum + (f.sizeBytes ?? 0), 0);
  const { pdfs, presentation } = splitGameFiles(items);
  // Remounts the link boxes after a save, so they show what was saved.
  const editorKey = items.map((f) => `${f.id}:${f.externalUrl}:${f.title}:${f.fileName}`).join("|");

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Breadcrumbs
          items={[
            { label: "Games", href: "/admin/library" },
            { label: playlist.name },
          ]}
        />
        {siblings.length > 1 && (
          <nav aria-label="Other games" className="flex items-center gap-1.5">
            <ShowStep show={prev} direction="prev" />
            <span className="px-1 text-sm whitespace-nowrap text-mist">
              {at + 1} of {siblings.length}
            </span>
            <ShowStep show={next} direction="next" />
          </nav>
        )}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="text-[clamp(2.1rem,5vw,3rem)]">{playlist.name}</h1>
        {playlist.isPublished ? (
          <span className="tag bg-ok/15 text-ok">Visible to customers</span>
        ) : (
          <span className="tag">Hidden from customers</span>
        )}
        <Link href={`/portal/${playlist.slug}`} className="btn btn-quiet btn-sm ml-auto">
          View as customer
        </Link>
      </div>
      <p className="mt-1 text-mist">
        {items.length === 1 ? "1 file" : `${items.length} files`}
        {totalBytes > 0 && ` · ${formatBytes(totalBytes)}`}
      </p>

      <div className="mt-8 grid items-start gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="grid gap-6">
          <section className="panel p-6 sm:p-7" aria-labelledby="zoho-heading">
            <h2 id="zoho-heading" className="font-sans text-lg font-bold">
              Game files from Zoho
            </h2>
            <p className="mt-1 text-sm text-mist">
              In WorkDrive, right-click each file → Share → External share link, make sure downloads are allowed, and
              paste the links here. Customers get a download button for each one.
            </p>
            <div className="mt-6">
              <ActionForm
                action={saveGameFiles.bind(null, playlist.id)}
                submitLabel="Save game files"
                pendingLabel="Checking links…"
              >
                <GameFilesEditor
                  key={editorKey}
                  maxPdfs={MAX_PDFS}
                  presentation={
                    presentation && {
                      id: presentation.id,
                      title: presentation.title,
                      externalUrl: presentation.externalUrl,
                      fileName: presentation.fileName,
                    }
                  }
                  pdfs={pdfs.map((f) => ({ id: f.id, title: f.title, externalUrl: f.externalUrl, fileName: f.fileName }))}
                />
              </ActionForm>
            </div>
          </section>

          <section className="panel" aria-labelledby="files-heading">
            <h2 id="files-heading" className="px-6 pt-6 font-sans text-lg font-bold">
              What customers see
            </h2>
            {items.length === 0 ? (
              <p className="px-6 pb-6 pt-2 text-mist">No files yet. Paste the Zoho links above.</p>
            ) : (
              <ul className="mt-3 divide-y divide-line pb-2">
                {[...(presentation ? [presentation] : []), ...pdfs].map((f) => (
                  <li key={f.id} className="flex items-center gap-4 px-4 py-3 sm:px-6">
                    <FileIcon kind={f.kind} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold break-words">{f.title}</span>
                      <span className="block text-sm text-mist">
                        {kindLabel(f.kind)}
                        {f.sizeBytes ? ` · ${formatBytes(f.sizeBytes)}` : ""}
                        {f.fileName && f.fileName !== f.title ? ` · ${f.fileName}` : ""}
                        {` · added ${formatDate(f.createdAt)}`}
                      </span>
                    </span>
                    <a href={f.externalUrl} target="_blank" rel="noreferrer" className="btn btn-quiet btn-sm shrink-0">
                      Test link
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="grid gap-6">
          <section className="panel p-6" aria-labelledby="settings-heading">
            <h2 id="settings-heading" className="font-sans text-lg font-bold">
              Game settings
            </h2>
            <div className="mt-4">
              <ActionForm action={updatePlaylist.bind(null, playlist.id)} submitLabel="Save game">
                <div>
                  <label htmlFor="pl-name" className="label">
                    Name
                  </label>
                  <input id="pl-name" name="name" className="field" required defaultValue={playlist.name} />
                </div>
                <div>
                  <label htmlFor="pl-description" className="label">
                    Description
                  </label>
                  <input id="pl-description" name="description" className="field" defaultValue={playlist.description} />
                </div>
                <div>
                <label htmlFor="pl-sort" className="label">
                  Order
                </label>
                <input
                  id="pl-sort"
                  name="sortOrder"
                  type="number"
                  className="field"
                  defaultValue={playlist.sortOrder}
                />
                </div>
                <div>
                  <label htmlFor="pl-slug" className="label">
                    Web address
                  </label>
                  <input id="pl-slug" name="slug" className="field" defaultValue={playlist.slug} />
                </div>
                <label className="check">
                  <input type="checkbox" name="isPublished" defaultChecked={playlist.isPublished} />
                  <span>Visible to customers</span>
                </label>
              </ActionForm>
            </div>
          </section>

          <section className="rounded-[var(--radius-card)] border border-red/40 p-6">
            <h2 className="font-sans text-lg font-bold">Delete game</h2>
            <p className="mt-1 text-sm text-mist">
              Deletes the game and its download links. Files in Zoho aren&apos;t touched.
            </p>
            <div className="mt-4">
              <ActionForm
                action={deletePlaylist.bind(null, playlist.id)}
                submitLabel="Delete game"
                pendingLabel="Deleting…"
                submitClassName="btn btn-danger btn-sm"
                confirm={`Delete ${playlist.name} and its ${items.length} download links? This can't be undone.`}
              >
                {null}
              </ActionForm>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
