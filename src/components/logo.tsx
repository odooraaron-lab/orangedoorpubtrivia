import Link from "next/link";

export function Logo({ className = "", href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={`inline-block shrink-0 ${className}`} aria-label="Orange Door Pub Trivia home">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/logo.png" alt="Orange Door Pub Trivia" width={930} height={275} className="h-auto w-full" />
    </Link>
  );
}
