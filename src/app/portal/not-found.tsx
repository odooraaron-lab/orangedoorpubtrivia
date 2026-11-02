import Link from "next/link";

export default function PortalNotFound() {
  return (
    <div className="panel max-w-2xl p-8">
      <h1 className="text-3xl">That isn&apos;t one of your games</h1>
      <p className="mt-3 text-mist">
        The game may have been renamed or removed, or it isn&apos;t included in your account. If you think you
        should have it, email us.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/portal" className="btn btn-red">
          Back to your games
        </Link>
      </div>
    </div>
  );
}
