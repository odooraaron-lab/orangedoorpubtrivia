import Link from "next/link";
import { CurrentYear } from "@/components/current-year";
import { SITE } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line bg-black/80">
      <div className="wrap flex flex-col gap-4 py-8 text-sm text-fog sm:flex-row sm:items-center sm:justify-between">
        <p>
          © <CurrentYear /> {SITE.name}. Brought to you by{" "}
          <a href={SITE.infoUrl} target="_blank" rel="noreferrer" className="text-white/90 underline-offset-4 hover:underline">
            Orange Door
          </a>
          .
        </p>
        <ul className="flex flex-wrap gap-x-5 gap-y-2">
          <li>
            <Link href="/login" className="text-white/90 hover:text-white">
              Customer login
            </Link>
          </li>
          <li>
            <Link href="/contact-us" className="text-white/90 hover:text-white">
              Contact us
            </Link>
          </li>
          {SITE.social.map((s) => (
            <li key={s.href}>
              <a href={s.href} target="_blank" rel="noreferrer" className="text-white/90 hover:text-white">
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
