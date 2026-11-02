import Link from "next/link";
import { Logo } from "@/components/logo";

export function SiteHeader() {
  return (
    <header className="relative z-30 border-b border-line bg-black/90">
      <div className="wrap flex items-center gap-3 py-3 sm:gap-6">
        <Logo className="w-[118px] min-[400px]:w-[140px] sm:w-[200px]" />
        <nav aria-label="Main" className="ml-auto flex shrink-0 items-center gap-2">
          <Link href="/contact-us" className="btn btn-ghost btn-sm px-2.5 sm:px-3.5">
            Contact
          </Link>
          <Link href="/login" className="btn btn-orange btn-sm px-2.5 sm:px-3.5">
            <span className="sm:hidden">Log in</span>
            <span className="max-sm:hidden">Customer login</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
