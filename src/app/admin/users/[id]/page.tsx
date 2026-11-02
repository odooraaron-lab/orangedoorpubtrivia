import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { accessGrants, playlists, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { emailConfigured } from "@/lib/email";
import { formatDate, formatDateTime } from "@/lib/format";
import { ActionForm } from "@/components/admin/action-form";
import { UserFields } from "@/components/admin/user-fields";
import { AccessEditor } from "@/components/admin/access-editor";
import { PasswordInput } from "@/components/admin/password-input";
import { Breadcrumbs } from "@/components/portal/breadcrumbs";
import { ActivitySummaryRow, ActivityTimeline, DownloadedShows } from "@/components/admin/customer-activity";
import {
  ACTIVITY_FILTERS,
  customerDownloadedShows,
  customerSummary,
  customerTimeline,
  type ActivityFilter,
} from "@/lib/customer-activity";
import { deleteUser, resetUserHistory, saveAccess, sendPasswordLink, setUserPassword, updateUser } from "../actions";

export const metadata: Metadata = { title: "Customer" };

export default async function UserPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; log?: string }>;
}) {
  const admin = await requireAdmin();
  const { id } = await params;
  const { created, log } = await searchParams;
  const filter: ActivityFilter = log && log in ACTIVITY_FILTERS ? (log as ActivityFilter) : "all";
  if (!z.uuid().safeParse(id).success) notFound();

  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!user) notFound();

  const [grants, pls, summary, shows, timeline] = await Promise.all([
    db.select().from(accessGrants).where(eq(accessGrants.userId, id)),
    db.select().from(playlists).orderBy(asc(playlists.sortOrder), asc(playlists.name)),
    customerSummary(id),
    customerDownloadedShows(id),
    customerTimeline(id, filter),
  ]);

  const games = pls.map((p) => ({ id: p.id, name: p.name, isPublished: p.isPublished }));

  const isSelf = admin.id === user.id;
  const title = user.venue || user.name || user.email;

  return (
    <>
      <Breadcrumbs items={[{ label: "Customers", href: "/admin/users" }, { label: title }]} />
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="text-[clamp(2.1rem,5vw,3rem)]">{title}</h1>
        {!user.isActive && <span className="tag">Switched off</span>}
        {user.role === "admin" && <span className="tag bg-tang/15 text-tang">Admin</span>}
      </div>
      <p className="mt-1 text-mist">
        Added {formatDate(user.createdAt)} · {user.lastLoginAt ? `last logged in ${formatDateTime(user.lastLoginAt)}` : "hasn't logged in yet"}
        {!user.passwordHash && " · hasn't set a password yet"}
      </p>

      {created && (
        <p className="alert alert-ok mt-6 max-w-3xl" role="status">
          Customer created. Now choose what they can download.
        </p>
      )}

      <div className="mt-8 grid items-start gap-6 xl:grid-cols-2">
        <section className="panel p-6 sm:p-8" aria-labelledby="access-heading">
          <h2 id="access-heading" className="font-sans text-xl font-bold">
            What they can download
          </h2>
          <div className="mt-5">
            <ActionForm action={saveAccess.bind(null, user.id)} submitLabel="Save access">
              <AccessEditor
                games={games}
                initialAll={user.accessAll}
                initialPlaylists={grants.flatMap((g) => (g.playlistId ? [g.playlistId] : []))}
              />
            </ActionForm>
          </div>
        </section>

        <section className="panel p-6 sm:p-8" aria-labelledby="details-heading">
          <h2 id="details-heading" className="font-sans text-xl font-bold">
            Details
          </h2>
          <div className="mt-5">
            <ActionForm action={updateUser.bind(null, user.id)} submitLabel="Save details">
              <UserFields values={user} />
              <label className="check">
                <input type="checkbox" name="isActive" defaultChecked={user.isActive} disabled={isSelf} />
                <span>
                  <span className="block font-semibold">Account switched on</span>
                  <span className="block text-sm text-mist">Switch off to stop them logging in without deleting them.</span>
                </span>
              </label>
              {isSelf && <input type="hidden" name="isActive" value="on" />}
            </ActionForm>
          </div>
        </section>

        <section className="panel p-6 sm:p-8" aria-labelledby="password-heading">
          <h2 id="password-heading" className="font-sans text-xl font-bold">
            Password
          </h2>
          <div className="mt-5 grid gap-8">
            <ActionForm
              action={sendPasswordLink.bind(null, user.id)}
              submitLabel={user.passwordHash ? "Send a password reset link" : "Send their invite again"}
              pendingLabel="Sending…"
              submitClassName="btn btn-ghost"
            >
              <p className="text-mist">
                {emailConfigured()
                  ? "Emails them a link to choose their own password."
                  : "Emails are off, so you'll get a link to copy and send them yourself."}
              </p>
            </ActionForm>
            <ActionForm
              action={setUserPassword.bind(null, user.id)}
              submitLabel="Set password"
              submitClassName="btn btn-ghost"
              resetOnSuccess
            >
              <div>
                <label htmlFor="password" className="label">
                  Or set a new password yourself
                </label>
                <PasswordInput />
                <p className="hint">This logs them out of any devices they&apos;re using.</p>
              </div>
            </ActionForm>
          </div>
        </section>


      </div>

      <section className="panel mt-6 p-6 sm:p-8" aria-labelledby="activity-heading" id="activity">
        <h2 id="activity-heading" className="font-sans text-xl font-bold">
          Activity
        </h2>
        <div className="mt-4">
          <ActivitySummaryRow summary={summary} lastLogin={user.lastLoginAt} />
        </div>

        <h3 className="mt-8 font-sans text-lg font-bold">Games they&apos;ve downloaded</h3>
        <DownloadedShows shows={shows} />

        <h3 className="mt-8 font-sans text-lg font-bold">Everything they&apos;ve done</h3>
        <ActivityTimeline events={timeline.events} filter={filter} />
      </section>

      <section className="mt-10 max-w-3xl rounded-[var(--radius-card)] border border-line p-6 sm:p-8">
        <h2 className="font-sans text-xl font-bold">Reset history</h2>
        <p className="mt-2 text-mist">
          Clears their downloads, logins and everything else in their activity, so the &quot;Downloaded&quot; marks
          and the timeline start fresh. Their account, password, access and settings stay as they are.
        </p>
        <div className="mt-5">
          <ActionForm
            action={resetUserHistory.bind(null, user.id)}
            submitLabel="Reset history"
            pendingLabel="Resetting…"
            submitClassName="btn btn-ghost"
            confirm={`Clear all history for ${title}? Their account and access stay as they are. This can't be undone.`}
          >
            {null}
          </ActionForm>
        </div>
      </section>

      {!isSelf && (
        <section className="mt-10 max-w-3xl rounded-[var(--radius-card)] border border-red/40 p-6 sm:p-8">
          <h2 className="font-sans text-xl font-bold">Delete customer</h2>
          <p className="mt-2 text-mist">
            Removes their account and their whole activity history (downloads, logins, everything) for good. To stop them logging in but keep the history, switch their account off instead.
          </p>
          <div className="mt-5">
            <ActionForm
              action={deleteUser.bind(null, user.id)}
              submitLabel="Delete customer"
              pendingLabel="Deleting…"
              submitClassName="btn btn-danger"
              confirm={`Delete ${title}? This can't be undone.`}
            >
              {null}
            </ActionForm>
          </div>
        </section>
      )}
    </>
  );
}
