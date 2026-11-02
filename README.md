# Orange Door Pub Trivia

The customer portal for Orange Door Pub Trivia, at www.orangedoorpubtrivia.com. Built from the Bar Beats Bingo portal, with the bingo player and checker taken out.

- **Private**: there's no public website. The address opens the login page, and every page tells search engines not to list it (`robots.txt` blocks the whole site, plus `noindex` on every page).
- **Customer portal** (`/portal`): after logging in, customers see one page listing every game on their account. Opening a game gives a download button for its **PowerPoint presentation** and each of its **PDFs** (answer sheets, host sheet, scoresheet…).
- **Phone app**: customers can add the portal to their home screen and open it like an app.
- **Admin** (`/admin`): add customers, choose what each one can download (every game, or single games), set an access end date, paste each game's Zoho WorkDrive links, see who downloaded what.

Built with Next.js 16 and Neon Postgres (via Drizzle ORM). Files stay in Zoho WorkDrive; the site stores their share links. Runs on Vercel.

---

## 1. Deploy to Vercel

1. In Vercel, **Add New → Project** and import `odooraaron-lab/orangedoorpubtrivia`. Keep the default settings.
2. In the project, open **Storage → Create Database → Neon** and connect it to the project (all environments). This adds `DATABASE_URL`.
3. Under **Settings → Environment Variables**, add:
   - `ADMIN_EMAIL`: the email you'll log in with
   - `ADMIN_PASSWORD`: a temporary password, at least 10 characters
   - `APP_URL`: `https://www.orangedoorpubtrivia.com`
4. **Deployments → Redeploy**. Every build sets up the database tables and creates your admin login if it doesn't exist yet.
5. Go to `https://<your-project>.vercel.app/login` and log in. Change your password from **Customer view → Account**, then you can delete `ADMIN_PASSWORD` from Vercel.

## 2. Point orangedoorpubtrivia.com at Vercel

In Vercel, **Settings → Domains → Add** `orangedoorpubtrivia.com` and `www.orangedoorpubtrivia.com`, then add the DNS records Vercel shows where the domain is registered. Make `www.orangedoorpubtrivia.com` the main one and have `orangedoorpubtrivia.com` redirect to it.

## 3. Turn on emails (optional)

Without email, everything still works: when a customer forgets their password, open their page in Admin and click **Send a password reset link**, which gives you a link to send them yourself.

To send emails automatically (password resets and customer invites):

1. In [Resend](https://resend.com), under **Domains**, add `orangedoorpubtrivia.com` and add the DNS records it shows. Wait until it says **Verified**.
2. Add `RESEND_API_KEY` in Vercel. Optionally add `EMAIL_FROM` (defaults to `Orange Door Pub Trivia <hello@orangedoorpubtrivia.com>`). Redeploy.
3. On the admin **Overview**, click **Send me a test email**. If it can't send, it says why.

---

## Using the admin area

**Adding a game**

1. **Games → Add a game** (e.g. `Week 01`).
2. In Zoho WorkDrive, open the game's folder. For each file: right-click → **Share → External share link**, make sure **downloads are allowed**, and copy the link.
3. On the game's page, under **Game files from Zoho**:
   - paste the **PowerPoint** (.pptx) link,
   - paste each **PDF** link. There are three PDF boxes to start with; **Add another PDF** adds more (up to 12) and the **×** removes one.
   - The name boxes are optional: they're what customers see on each download. Leave one blank and the file's name from Zoho is used.
4. **Save game files**. Each link is checked and the real file name and size are picked up from Zoho. If a link opens a Zoho page instead of the file (for example, you shared the folder rather than the file), or isn't the type it should be, you'll see a warning saying which one.
5. Tick **Visible to customers** under Game settings when it's ready. New games start hidden.

Customers see the PowerPoint first, then the PDFs in the order you entered them, each with a **Download** button. Games are listed in order of their **Order** number (under Game settings), lowest first. To change a link later, paste the new one over it and save again.

**Customers → Add a customer**, then choose what they can download:

- **Every game**: includes games added later.
- **Single games**: just those.

Set **Access ends** for subscriptions; after that date they can still log in but see a renewal message instead of files. Switch an account off to block logins without deleting it. Downloads are logged on the overview and on each customer's page.

## Changing the wording or graphics

- Site name: `src/lib/site.ts`.
- Logo: `public/brand/logo.png`. App icons: `public/icons/` and `src/app/icon.png`, `src/app/apple-icon.png`.
- Colours and fonts: the top of `src/app/globals.css` (brand orange is `#f47d20`; headings use Anton, the handwritten lines use Permanent Marker).

## Troubleshooting

**Logging in fails.** The site can't reach the database. In Vercel, open **Storage → your Neon database → Connect Project**, make sure this project is connected for **Production** (and Preview), then **Deployments → Redeploy**. A deploy without a database stops with this message in the build log, and the previous version stays live.

**Lost the admin login?** Set `ADMIN_EMAIL`, `ADMIN_PASSWORD` and `ADMIN_RESET_PASSWORD=yes` in Vercel, redeploy, log in, then remove all three.

**Changed an environment variable?** Vercel only picks it up after a redeploy.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in DATABASE_URL (a Neon branch works well) and ADMIN_*
npm run db:migrate
npm run dev
```

After changing `src/db/schema.ts`, run `npm run db:generate` to create a migration in `drizzle/`. It's applied on the next build.

## Environment variables

| Variable | Needed for |
| --- | --- |
| `DATABASE_URL` | Everything (Neon) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Creating the first admin |
| `APP_URL` | Links in emails (optional) |
| `RESEND_API_KEY` (plus optional `EMAIL_FROM`) | Emails (optional) |
| `ADMIN_RESET_PASSWORD` | Set to `yes` with `ADMIN_EMAIL` and `ADMIN_PASSWORD` to reset a lost admin login on the next deploy, then remove all three |

## How it fits together

```
src/app/(auth)       login, forgot password, choose password
src/app/portal       customer pages: the list of games, then each game's downloads
src/app/admin        admin area
src/app/api          file downloads (checks access, logs it, sends the customer to the Zoho file)
src/lib              auth, access rules, link checks, email
src/db/schema.ts     database tables (a game is stored in the "playlists" table, and every game sits in one
                     built-in "games" category: both kept from the bingo portal, never shown)
scripts/migrate.mjs  runs before each build: migrations, the built-in category, first admin
```

Security notes: passwords are hashed with scrypt; sessions are random tokens stored hashed in the database; login is rate-limited; every page, action and download re-checks who is logged in and what they can access. Customers never see the Zoho links on the page: downloads go through `/api/files/<id>/download`, which checks their access first. Zoho share links are public, though, so anyone a customer passes a downloaded link to can open that file.
