import type { Metadata } from "next";
import Link from "next/link";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { files, playlists } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { formatBytes } from "@/lib/format";
import { ActionForm } from "@/components/admin/action-form";
import { createPlaylist } from "./actions";

export const metadata: Metadata = { title: "Games" };

export default async function LibraryPage() {
  await requireAdmin();

  const rows = await db
    .select({
      id: playlists.id,
      name: playlists.name,
      isPublished: playlists.isPublished,
      sortOrder: playlists.sortOrder,
      pdfs: sql<number>`count(${files.id}) filter (where ${files.kind} <> 'presentation')::int`,
      hasPresentation: sql<boolean>`bool_or(${files.kind} = 'presentation')`,
      bytes: sql<number>`coalesce(sum(${files.sizeBytes}), 0)::float8`,
    })
    .from(playlists)
    .leftJoin(files, eq(files.playlistId, playlists.id))
    .groupBy(playlists.id)
    .orderBy(asc(playlists.sortOrder), asc(playlists.name));

  return (
    <>
      <h1 className="text-[clamp(2.2rem,5vw,3rem)]">Games</h1>
      <p className="mt-2 max-w-2xl text-mist">
        Each game holds the files customers download: the PowerPoint and the PDFs. Open a game to paste its Zoho links.
      </p>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section className="panel overflow-x-auto">
          {rows.length === 0 ? (
            <p className="p-8 text-mist">No games yet. Add your first one.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Game</th>
                  <th>Files</th>
                  <th>Order</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className="hover:bg-white/[0.02]">
                    <td>
                      <Link href={`/admin/library/playlist/${p.id}`} className="font-semibold hover:underline">
                        {p.name}
                      </Link>
                      {!p.isPublished && <span className="tag ml-2">Hidden</span>}
                    </td>
                    <td className="text-mist">
                      {p.hasPresentation ? "PowerPoint" : <span className="text-tang">No PowerPoint</span>}
                      {` · ${p.pdfs} PDF${p.pdfs === 1 ? "" : "s"}`}
                      {p.bytes > 0 && <span className="text-fog"> · {formatBytes(p.bytes)}</span>}
                    </td>
                    <td className="text-fog">{p.sortOrder}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {rows.length > 1 && (
            <p className="border-t border-line px-6 py-4 text-sm text-fog">
              Customers see games in this order (lowest Order number first). Change a game&apos;s order on its page.
            </p>
          )}
        </section>

        <section className="panel p-6">
          <h2 className="font-sans text-lg font-bold">Add a game</h2>
          <div className="mt-4">
            <ActionForm action={createPlaylist} submitLabel="Add game" pendingLabel="Adding…">
              <div>
                <label htmlFor="pl-name" className="label">
                  Name
                </label>
                <input id="pl-name" name="name" required className="field" placeholder="e.g. Week 01" />
              </div>
              <div>
                <label htmlFor="pl-description" className="label">
                  Short description (optional)
                </label>
                <input id="pl-description" name="description" className="field" />
              </div>
              <label className="check">
                <input type="checkbox" name="isPublished" />
                <span>
                  <span className="block">Visible to customers straight away</span>
                  <span className="block text-sm text-mist">Leave unticked to add the files first.</span>
                </span>
              </label>
            </ActionForm>
          </div>
        </section>
      </div>
    </>
  );
}
