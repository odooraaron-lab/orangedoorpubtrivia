import Link from "next/link";
import { ChevronRight, Lock, Search } from "lucide-react";
import { requireUser, accessHasExpired } from "@/lib/auth";
import { listGenres, type GenreSummary } from "@/lib/library";
import { InstallApp } from "@/components/portal/install-app";

const gameCount = (n: number) => (n === 1 ? "1 game" : `${n} games`);

function OpenCategory({ c }: { c: GenreSummary }) {
  return (
    <Link href={`/portal/${c.slug}`} className="category-card group relative flex h-full items-center gap-4 overflow-hidden p-5">
      <span aria-hidden className="category-card-badge grid h-12 w-12 shrink-0 place-items-center">
        ?
      </span>
      <span className="relative min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="display text-[1.55rem] leading-tight">{c.name}</span>
          {!c.isPublished && <span className="tag">Hidden</span>}
        </span>
        {c.description && <span className="mt-1 line-clamp-2 text-sm text-mist">{c.description}</span>}
        <span className="mt-2 block text-sm font-semibold text-tang">
          {gameCount(c.available)} ready to download
          {c.total > c.available && <span className="font-normal text-mist"> · {c.total - c.available} more locked</span>}
        </span>
      </span>
      <ChevronRight size={22} aria-hidden className="relative shrink-0 text-mist transition-colors group-hover:text-white" />
    </Link>
  );
}

function OtherCategory({ c, expired }: { c: GenreSummary; expired: boolean }) {
  const body = (
    <>
      <span
        aria-hidden
        className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-line bg-ink text-fog"
      >
        <Lock size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="display text-[1.55rem] leading-tight text-mist">{c.name}</span>
          {!c.isPublished && <span className="tag">Hidden</span>}
        </span>
        <span className="mt-2 block text-sm text-fog">
          {c.state === "soon" ? "Coming soon" : `${gameCount(c.total)} · ${expired ? "renew to download" : "not on your plan"}`}
        </span>
      </span>
    </>
  );
  if (c.state === "soon") {
    return (
      <div className="flex h-full items-center gap-4 rounded-2xl border border-dashed border-line bg-ink/60 p-5">
        {body}
      </div>
    );
  }
  return (
    <Link
      href={`/portal/${c.slug}`}
      className="group flex h-full items-center gap-4 rounded-2xl border border-line bg-ink/80 p-5 transition-colors hover:border-white/25 hover:bg-coal"
    >
      {body}
      <span className="shrink-0 text-sm font-semibold text-fog transition-colors group-hover:text-white">
        {expired ? "Renew" : "Ask to add"}
      </span>
    </Link>
  );
}

export default async function PortalHomePage() {
  const user = await requireUser();
  const all = await listGenres(user);
  const open = all.filter((c) => c.state === "open");
  const others = all.filter((c) => c.state !== "open");
  const anyLocked = others.some((c) => c.state === "locked");
  const firstName = user.name.trim().split(/\s+/)[0];
  const expired = accessHasExpired(user);

  return (
    <>
      <h1 className="text-[clamp(2.2rem,5vw,3.2rem)]">{firstName ? `Welcome, ${firstName}` : "Your library"}</h1>
      {open.length > 0 && <p className="mt-2 text-lg text-mist">Choose a category to see its games.</p>}

      <form action="/portal/search" role="search" className="mt-6 flex max-w-md gap-2">
        <label htmlFor="q" className="sr-only">
          Search games and files
        </label>
        <input id="q" name="q" type="search" placeholder="Search games and files" className="field" minLength={2} />
        <button type="submit" className="btn btn-ghost px-3" aria-label="Search">
          <Search size={18} aria-hidden />
        </button>
      </form>

      <InstallApp variant="banner" />

      {open.length === 0 && (
        <div className="panel mt-10 max-w-2xl p-8">
          <h2 className="text-2xl">{expired ? "Your access has ended" : "No games yet"}</h2>
          <p className="mt-2 text-mist">
            {expired
              ? "Contact us to renew and your library will be back straight away."
              : "There aren't any games on your account yet. If you were expecting some, let us know."}
          </p>
          <Link href="/contact-us" className="btn btn-orange mt-6">
            Contact us
          </Link>
        </div>
      )}

      {open.length > 0 && (
        <section aria-labelledby="categories-heading" className="mt-12">
          <h2 id="categories-heading" className="marker text-xl text-tang">
            Your categories
          </h2>
          <ul className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {open.map((c) => (
              <li key={c.id} className="min-w-0">
                <OpenCategory c={c} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {others.length > 0 && (
        <section aria-labelledby="more-heading" className="mt-12">
          <h2 id="more-heading" className="marker text-xl text-tang">
            {anyLocked ? "More categories" : "Coming soon"}
          </h2>
          {anyLocked && (
            <p className="mt-1 text-sm text-mist">
              {expired
                ? "Renew your access to download these again."
                : "These aren't on your plan yet. Open one to ask us to add it."}
            </p>
          )}
          <ul className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((c) => (
              <li key={c.id} className="min-w-0">
                <OtherCategory c={c} expired={expired} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
