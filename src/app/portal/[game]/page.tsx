import { notFound } from "next/navigation";
import { after } from "next/server";
import { Download } from "lucide-react";
import { logActivity } from "@/lib/activity";
import { requireUser } from "@/lib/auth";
import { downloadedFiles, getGame } from "@/lib/library";
import { formatBytes, kindLabel } from "@/lib/format";
import { splitGameFiles } from "@/lib/game-files";
import { Breadcrumbs } from "@/components/portal/breadcrumbs";
import { FileIcon } from "@/components/portal/file-icon";
import { DownloadLink, DownloadMarks, FileDownloadedNote, ShowDownloadedTag } from "@/components/portal/download-marks";

function extensionOf(name: string) {
  const ext = name.split(".").pop();
  return ext && ext !== name && ext.length <= 5 ? ext.toUpperCase() : "";
}

type GameFile = NonNullable<Awaited<ReturnType<typeof getGame>>>["files"][number];

function FileCard({ f, featured = false }: { f: GameFile; featured?: boolean }) {
  const meta = [extensionOf(f.fileName), f.sizeBytes ? formatBytes(f.sizeBytes) : ""].filter(Boolean);
  return (
    <li className={`panel flex flex-col p-4 sm:p-5 ${featured ? "panel-orange" : ""}`}>
      <div className="flex items-center gap-3">
        <FileIcon kind={f.kind} />
        <span className="text-sm font-semibold text-mist">{kindLabel(f.kind)}</span>
      </div>
      <p className="mt-3 break-words text-[1.05rem] font-bold leading-snug sm:mt-4 sm:text-lg">{f.title}</p>
      {meta.length > 0 && <p className="mt-1 text-sm text-mist">{meta.join(" · ")}</p>}
      <FileDownloadedNote fileId={f.id} />
      <div className="mt-auto pt-4 sm:pt-5">
        <DownloadLink fileId={f.id} href={`/api/files/${f.id}/download`} className="btn btn-orange w-full">
          <Download size={18} aria-hidden /> Download
          <span className="sr-only"> {f.title}</span>
        </DownloadLink>
      </div>
    </li>
  );
}

export default async function GamePage({ params }: { params: Promise<{ game: string }> }) {
  const { game: slug } = await params;
  const user = await requireUser();
  const data = await getGame(user, slug);
  if (!data) notFound();
  const { game, files } = data;
  after(() => logActivity(user.id, "show_viewed", { playlistId: game.id, detail: game.name, onceEveryMinutes: 30 }));

  // What they've downloaded before, so the page can say so.
  const done = await downloadedFiles(user.id, game.id);
  const doneFiles = Object.fromEntries([...done].map(([id, at]) => [id, at.toISOString()]));
  const lastDone = [...done.values()].sort((a, b) => b.getTime() - a.getTime())[0];
  const { pdfs, presentation } = splitGameFiles(files);

  return (
    <DownloadMarks files={doneFiles} show={lastDone?.toISOString() ?? null} showFileIds={files.map((f) => f.id)}>
      <Breadcrumbs
        items={[
          { label: "Your games", href: "/portal" },
          { label: game.name },
        ]}
      />
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="text-[clamp(2.1rem,5vw,3rem)]">{game.name}</h1>
        {!game.isPublished && <span className="tag">Hidden from customers</span>}
        <ShowDownloadedTag />
      </div>
      {game.description && <p className="mt-2 max-w-2xl text-lg text-mist">{game.description}</p>}

      {files.length === 0 ? (
        <p className="panel mt-10 p-8 text-mist">The files for this game are on their way. Check back soon.</p>
      ) : (
        <div className="mt-10 grid gap-10">
          {presentation && (
            <section aria-labelledby="ppt-heading">
              <h2 id="ppt-heading" className="font-sans text-lg font-bold text-tang">
                The presentation
              </h2>
              <ul className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <FileCard f={presentation} featured />
              </ul>
            </section>
          )}
          {pdfs.length > 0 && (
            <section aria-labelledby="pdf-heading">
              <h2 id="pdf-heading" className="font-sans text-lg font-bold text-tang">
                Printables
              </h2>
              <ul className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {pdfs.map((f) => (
                  <FileCard key={f.id} f={f} />
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </DownloadMarks>
  );
}
