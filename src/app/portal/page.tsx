import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { requireUser, accessHasExpired } from "@/lib/auth";
import { downloadedGames, listGames } from "@/lib/library";
import { formatDate } from "@/lib/format";
import { InstallApp } from "@/components/portal/install-app";
import { DownloadedTag } from "@/components/portal/download-marks";

export default async function PortalHomePage() {
  const user = await requireUser();
  const games = await listGames(user);
  const done = await downloadedGames(
    user.id,
    games.map((g) => g.id),
  );
  const firstName = user.name.trim().split(/\s+/)[0];
  const expired = accessHasExpired(user);

  return (
    <>
      <h1 className="text-[clamp(2.2rem,5vw,3.2rem)]">{firstName ? `Welcome, ${firstName}` : "Your games"}</h1>
      {games.length > 0 && <p className="mt-2 text-lg text-mist">Open a game to download its PowerPoint and PDFs.</p>}

      <InstallApp variant="banner" />

      {games.length === 0 ? (
        <div className="panel mt-10 max-w-2xl p-8">
          <h2 className="text-2xl">{expired ? "Your access has ended" : "No games yet"}</h2>
          <p className="mt-2 text-mist">
            {expired
              ? "Contact us to renew and your games will be back straight away."
              : "There aren't any games on your account yet. If you were expecting some, let us know."}
          </p>
          <Link href="/contact-us" className="btn btn-orange mt-6">
            Contact us
          </Link>
        </div>
      ) : (
        <section aria-labelledby="games-heading" className="mt-10">
          <h2 id="games-heading" className="font-sans text-lg font-bold text-tang">
            Your games
          </h2>
          <ul className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {games.map((g) => (
              <li key={g.id} className="min-w-0">
                <Link
                  href={`/portal/${g.slug}`}
                  className="category-card group relative flex h-full items-center gap-4 overflow-hidden p-5"
                >
                  <span aria-hidden className="category-card-badge grid h-12 w-12 shrink-0 place-items-center">
                    ?
                  </span>
                  <span className="relative min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="display text-[1.55rem] leading-tight">{g.name}</span>
                      {!g.isPublished && <span className="tag">Hidden</span>}
                    </span>
                    {g.description && <span className="mt-1 line-clamp-2 text-sm text-mist">{g.description}</span>}
                    <span className="mt-2 flex flex-wrap items-center gap-2 text-sm text-mist">
                      {g.fileCount === 1 ? "1 file" : `${g.fileCount} files`}
                      {g.updatedAt && <span className="text-fog">· added {formatDate(g.updatedAt)}</span>}
                    </span>
                    {done.has(g.id) && <DownloadedTag at={done.get(g.id)!.toISOString()} className="mt-2" />}
                  </span>
                  <ChevronRight
                    size={22}
                    aria-hidden
                    className="relative shrink-0 text-mist transition-colors group-hover:text-white"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
