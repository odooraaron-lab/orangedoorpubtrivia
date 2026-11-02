import Link from "next/link";
import { count, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { downloads, files, playlists, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { emailConfigured } from "@/lib/email";
import { formatBytes, formatDateTime } from "@/lib/format";
import { ActionForm } from "@/components/admin/action-form";
import { sendTestEmail } from "./actions";

export default async function AdminHomePage() {
  await requireAdmin();

  const [[customers], [lists], [fileStats], recentDownloads] =
    await Promise.all([
      db.select({ n: count() }).from(users).where(eq(users.role, "member")),
      db.select({ n: count() }).from(playlists),
      db
        .select({ n: count(), bytes: sql<number>`coalesce(sum(${files.sizeBytes}), 0)::float8` })
        .from(files),
      db
        .select({
          at: downloads.createdAt,
          userId: users.id,
          who: sql<string>`coalesce(nullif(${users.venue}, ''), nullif(${users.name}, ''), ${users.email})`,
          title: files.title,
          playlist: playlists.name,
        })
        .from(downloads)
        .innerJoin(users, eq(users.id, downloads.userId))
        .innerJoin(files, eq(files.id, downloads.fileId))
        .innerJoin(playlists, eq(playlists.id, files.playlistId))
        .where(eq(users.role, "member"))
        .orderBy(desc(downloads.createdAt))
        .limit(10),
    ]);

  const stats = [
    { label: "Customers", value: customers.n, href: "/admin/users" },
    { label: "Games", value: lists.n, href: "/admin/library" },
    { label: "Files", value: fileStats.n, sub: formatBytes(fileStats.bytes) || undefined, href: "/admin/library" },
  ];

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-[clamp(2.2rem,5vw,3rem)]">Overview</h1>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/users/new" className="btn btn-red">
            Add a customer
          </Link>
          <Link href="/admin/library" className="btn btn-ghost">
            Manage games
          </Link>
        </div>
      </div>

      <ul className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3">
        {stats.map((s) => (
          <li key={s.label}>
            <Link href={s.href} className="panel block h-full p-5 hover:border-white/30">
              <span className="display block text-4xl">{s.value}</span>
              <span className="mt-1 block text-sm text-mist">
                {s.label}
                {s.sub && ` · ${s.sub}`}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <section className="panel mt-8 p-6">
        <h2 className="font-sans text-lg font-bold">Email</h2>
        {emailConfigured() ? (
          <p className="mt-1 text-sm text-mist">
            Emails are on: customers can reset their own passwords and you can email new customers an invite.
          </p>
        ) : (
          <p className="alert alert-info mt-3">
            <strong>Emails are off.</strong> Customers can&apos;t reset their own passwords, and new customers
            can&apos;t be emailed an invite. Add RESEND_API_KEY in Vercel and redeploy to switch this on.
          </p>
        )}
        <div className="mt-4">
          <ActionForm action={sendTestEmail} submitLabel="Send me a test email" pendingLabel="Sending…" submitClassName="btn btn-ghost btn-sm">
            {null}
          </ActionForm>
        </div>
      </section>

      <div className="mt-10 grid items-start gap-6">
        <section className="panel p-6">
          <h2 className="font-sans text-lg font-bold">Recent downloads</h2>
          {recentDownloads.length === 0 ? (
            <p className="mt-3 text-mist">No customer downloads yet.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>File</th>
                    <th>When</th>
                  </tr>
                </thead>
                <tbody>
                  {recentDownloads.map((d, i) => (
                    <tr key={i}>
                      <td>
                        <Link href={`/admin/users/${d.userId}`} className="hover:underline">
                          {d.who}
                        </Link>
                      </td>
                      <td>
                        {d.title}
                        <span className="block text-xs text-fog">{d.playlist}</span>
                      </td>
                      <td className="whitespace-nowrap text-mist">{formatDateTime(d.at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </div>
    </>
  );
}
