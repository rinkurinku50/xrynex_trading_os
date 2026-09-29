# Xrynex Trading OS

A trading workspace built on Next.js 14 (App Router) and Prisma with PostgreSQL as the database layer. Charts, screenshots and videos are not uploaded anywhere — you paste a Google Drive share link and the app renders it.

## Run it

```bash
npm install
cp .env.example .env
# update DATABASE_URL to your local or hosted PostgreSQL database
npx prisma db push
node scripts/seed-prisma.mjs   # optional: safely add demo rows; preserves existing data
npm run dev                   # http://localhost:3000
```

The demo seed can be run more than once. It only inserts missing examples and never clears existing records. Demo chart cards use a bundled illustration; demo Drive folders point to Drive’s My Drive page until you replace them with your own folder links.

The seed script adds clearly labeled `DEMO` examples to the existing account selected by `SEED_USER_EMAIL` (or the first address in `ADMIN_EMAILS`). It covers the dashboard, daily tasks/history, ideas/questions/archive, strategy lab, videos, charts, concepts, Drive folders, focus settings, and the Trading Plan calendar screenshot. It will not create an account or delete/overwrite existing user records. In local development, run it with the environment file loaded, for example `node --env-file=.env scripts/seed-prisma.mjs`.

For a local Postgres instance, use a URL like:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/trading_os?schema=public"
```

For a hosted Postgres database, use the provider URL and keep the `?schema=public` suffix if needed.

### Switch between local Postgres and Neon

The app uses the `DATABASE_URL` in the project-root `.env` file for local development. Stop the dev server before switching, change only that value, then restart `npm run dev`:

- **Local development:** set `DATABASE_URL` to your local PostgreSQL URL, for example `postgresql://postgres:postgres@localhost:5432/trading_os?schema=public`.
- **Test against Neon:** set it to the Neon **pooled** connection URL (pooler hostname, SSL required, and `pgbouncer=true` if needed). Every app write will now go to Neon, so use this only intentionally.
- **Switch back:** stop the dev server, restore the local URL in `.env`, and start it again.

The `.env` file is ignored by Git; never commit database URLs or passwords. Vercel has its own `DATABASE_URL` in **Project Settings → Environment Variables**. Editing local `.env` does not change production; update the Vercel variable and redeploy to switch the deployed app. Use Neon’s **direct, unpooled** URL only for Prisma schema operations such as `npx prisma db push`, and review any proposed schema changes before accepting them.

## Deploy with Neon and Vercel

This is a server-rendered Next.js app with Prisma/PostgreSQL; deploy it as a Vercel Next.js project, not a static export.

1. Create a Neon project and database. Keep the **pooled** connection string for the running app. For Prisma, Neon’s pooled URL should use the pooler hostname and include `sslmode=require` and `pgbouncer=true` (append parameters with `&` if the URL already has a query string).
2. Before deploying, apply the Prisma schema to the new Neon database using its **direct, unpooled** connection string:

  ```sh
  DATABASE_URL="<Neon direct connection string>" npx prisma db push
  ```

  Review any Prisma warning before accepting it. `db push` can change or drop columns when the database and schema differ. For an empty Neon database, it creates the current app schema. Do not point this at a database with important data until you have a backup and reviewed the proposed changes.
3. Push this project to a GitHub repository, import that repository in Vercel, and leave the framework/build settings at their detected Next.js defaults (`npm run build`).
4. Add these Vercel **Production** environment variables:

  | Variable | Value |
  | --- | --- |
  | `DATABASE_URL` | Neon pooled connection string (pooler hostname, SSL required, `pgbouncer=true`) |
  | `APP_URL` | Exact production origin, e.g. `https://your-project.vercel.app`; no path or trailing slash |
  | `ADMIN_EMAILS` | Comma-separated email addresses to grant admin when those accounts are provisioned |
  | `ENABLE_PUBLIC_SIGNUP` | `false` unless production email verification and account recovery are implemented |
  | `EMAIL_VERIFICATION_ENABLED` | `false` until a real verification-email flow exists |

  If using the legacy SSO integration, also set `LEGACY_SSO_ISSUER` and a newly generated, high-entropy `LEGACY_SSO_SECRET` (at least 32 bytes), plus `LEGACY_SSO_AUDIENCES` only if needed. Configure the matching issuer/secret on the legacy site's **server**. Never deploy the example value or reuse the local development secret.
5. Deploy from Vercel, then confirm sign-in, server actions/API requests, and reads/writes against Neon. If you add a custom domain, update `APP_URL` to that exact HTTPS origin and redeploy.

Vercel Preview deployments have different origins. Since this app validates write-request origins against `APP_URL`, set a stable preview/staging origin for preview testing, or use Production deployments for write testing; do not set `APP_URL` to a URL that changes on every preview build.

### Existing local data

Creating a Neon database and applying the schema does **not** copy local users or workspace records. If you need to keep existing data, take a PostgreSQL backup and plan a full data transfer (including users and sessions) before switching production traffic. Do not run the demo seed as a substitute for migrating user data. After migration, use the intended production login/SSO flow to verify the account and records before making the Vercel deployment public.

## Google Drive links

Share the file in Drive as **Anyone with the link → Viewer**, copy the link, and paste it into any of the "link" fields. The app accepts all of these shapes:

```
https://drive.google.com/file/d/FILE_ID/view?usp=sharing
https://drive.google.com/open?id=FILE_ID
FILE_ID
```

`lib/drive.js` turns them into what the browser needs:

| Use | URL produced |
| --- | --- |
| Images (charts, screenshots) | `https://drive.google.com/thumbnail?id=FILE_ID&sz=w1200` |
| Videos | `https://drive.google.com/file/d/FILE_ID/preview` in an iframe |
| Open in Drive | `https://drive.google.com/file/d/FILE_ID/view` |

If a file is still private, the image falls back to a "set sharing to anyone with the link" message rather than a broken image.

Folder links (`/drive/folders/...`) go in the `drive_folders` table and show in the Drive panel on the dashboard.

## Authentication and legacy-site SSO

The app uses database-backed sessions with random opaque tokens stored only as SHA-256 hashes. Session cookies are HttpOnly, SameSite=Lax, Secure in production, and expire after seven days. Passwords use a domain-separated SHA-256 pre-hash followed by bcrypt (so long passwords are not truncated). All app pages and data APIs require a session; workspace records are scoped to their owner. The existing pre-auth single-user workspace is assigned once to the first account authenticated through trusted legacy SSO; ordinary self-signups cannot claim those records. Authenticated users are currently provisioned by the legacy SSO or an administrator; public signup remains disabled until email verification and account recovery are configured.

Set `APP_URL` to the exact canonical origin (`https://...` in production). For production, terminate TLS at a trusted proxy and configure it to overwrite `X-Real-IP` / `X-Forwarded-For`, since these headers are used for auth rate limiting. Apply database schema updates before starting the app:

```sh
npx prisma db push
npm run build
npm run start
```

For account isolation, a single-user database migration is intentionally not claimed by public signup. Have the verified legacy SSO deliver the first authenticated login to transfer the existing workspace records; that one-time claim assigns them to that account. Otherwise, provision/claim existing data administratively before users sign up.

There is no built-in admin username or password. Set the comma-separated `ADMIN_EMAILS` environment variable to bootstrap designated accounts. When one of those users signs up, logs in, or is provisioned by verified SSO, the app stores `is_admin=true` on that user in the database. Admin authorization thereafter reads the user record from the database on each request; the environment list is only used to grant/bootstrap the role. Admins see **Admin Settings** in the sidebar and can control public signup there. The signup setting is stored in the database. `ENABLE_PUBLIC_SIGNUP` supplies the initial/default value until an admin saves a setting. In production, the existing email-verification environment gate still applies; only enable public signup when a verified email flow is configured.

### Single sign-on from the previous website

Do not put passwords, access tokens, or signed identity assertions in a browser URL. Configure `LEGACY_SSO_ISSUER` and the same high-entropy `LEGACY_SSO_SECRET` on both servers. The previous site must sign a short-lived HS256 JWT and send it server-to-server to `POST /api/auth/sso/exchange` as `Authorization: Bearer <assertion>`. Required JWT claims:

- `iss`: exactly `LEGACY_SSO_ISSUER`
- `aud`: `trading-os`
- `sub`: stable legacy account identifier
- `email`: verified account email, with `email_verified: true`
- `iat`, `exp`: expiration no more than 120 seconds after issue
- `jti`: unique, unguessable assertion identifier (single-use)

The exchange response contains a same-site one-time login URL valid for 60 seconds. Redirect the user's browser to that URL immediately; it atomically consumes the code and establishes the normal session cookie. Assertions are audience/issuer/time checked and replay-protected. Password-based accounts with an unverified email are never silently merged into legacy identities. If a legacy site's identity/claim contract differs, adapt the legacy server to this protocol rather than passing its existing long-lived session token through the browser. Configure reverse-proxy access logs not to record Authorization headers or one-time SSO codes.

Users sign in at `/login`. Public account creation at `/signup` is disabled by default; it can be enabled from Admin Settings (or initially with `ENABLE_PUBLIC_SIGNUP=true`) in development. In production, signup also requires `EMAIL_VERIFICATION_ENABLED=true`; a verification/reset email sender is not included yet. Protect the service with HTTPS, a trusted reverse proxy, database backups, and operational monitoring.

## What works

Every panel reads from Prisma, and everything you can see you can also change:

- **Daily Tasks** — open the sidebar section to assign High, Medium, or Low priority; complete tasks; move unfinished tasks to tomorrow; review overdue work in Pending and reschedule it for today; remove and restore tasks; and browse date-grouped Today, Upcoming, Completed, and Removed tasks. Completion and removal dates/times are retained. The dashboard's compact Today card only shows active tasks dated today.
- **Trading Plan** — save a Google Drive share link or direct image URL for this week's economic calendar screenshot.
- **Idea inbox / Questions** — capture, filter by status, change status inline.
- **Strategy lab** — status pipeline (Draft → Research → Backtesting → Testing → Active → Validated), editable rules, and optional sidebar links for selected strategies.
- **Video notes** — Drive videos play inline; favorite notes to keep them in a dedicated Favorites section.
- **Charts** — Drive screenshots in a grid.
- **Knowledge base** — your ICT concept notes, linked from the sidebar.
- **Archive** — dropped ideas.
- **Tutorial** — tabbed, step-by-step guides for each workspace section.

## Layout

```
app/
  page.jsx              dashboard
  ideas|questions|strategies|videos|charts|concepts|archive|tutorial|daily-tasks|trading-plan/
  api/                  REST routes: GET/POST on the collection, PATCH/DELETE on :id
components/             Sidebar, panels, forms, Drive media, equity curve
lib/db.js               Prisma client singleton + compatibility helpers
lib/queries.js          Prisma reads for the workspace pages
lib/drive.js            Drive link parsing
prisma/schema.prisma    Prisma schema for all app tables
scripts/seed-prisma.mjs sample content
```

## API

| Route | Methods |
| --- | --- |
| `/api/ideas`, `/api/ideas/:id` | GET (`?tag=`), POST / PATCH, DELETE |
| `/api/strategies`, `/api/strategies/:id` | GET, POST / PATCH, DELETE |
| `/api/videos`, `/api/videos/:id` | GET, POST / PATCH, DELETE |
| `/api/charts`, `/api/charts/:id` | GET, POST / PATCH, DELETE |
| `/api/tasks`, `/api/tasks/:id` | GET, POST / PATCH, DELETE |
| `/api/concepts` | GET, POST |
| `/api/focus` | GET, PATCH |

All writes validate input and only accept a whitelist of columns.

## Notes before you deploy

- Configure `ADMIN_EMAILS` before exposing administrator settings, and only enable public signup after implementing email verification and account recovery.
- `sz=w1200` on the Drive thumbnail endpoint controls image width; raise it for sharper charts.
- Drive rate-limits thumbnail requests if you load hundreds of images at once; the grid lazy-loads to stay under that.

## Connect a main website for single sign-on

Xrynex Trading OS supports a server-to-server SSO handoff. A user signs in to the main website, selects the Xrynex Trading OS link, and is redirected into Xrynex Trading OS without entering their credentials a second time. The main website must never send its password, session cookie, or a long-lived access token to the browser or Xrynex Trading OS.

### 1. Configure Xrynex Trading OS

Set these environment variables on the Xrynex Trading OS server (not in browser code):

| Variable | Value |
| --- | --- |
| `APP_URL` | The canonical Xrynex Trading OS origin, such as `https://trading.example.com`, with no path or trailing slash. |
| `LEGACY_SSO_ISSUER` | A stable identifier for the main website's identity provider, usually its canonical HTTPS origin. This value must exactly match the assertion's `iss` claim. |
| `LEGACY_SSO_SECRET` | A newly generated, high-entropy secret with at least 32 bytes. Store it in each server's secret manager/environment; never commit it or expose it to client-side code. |
| `LEGACY_SSO_AUDIENCES` | Optional comma-separated additional audiences if needed. The `trading-os` audience is always accepted. |

Use the *same* `LEGACY_SSO_SECRET` and `LEGACY_SSO_ISSUER` configuration on the main site's server. Keep `ENABLE_PUBLIC_SIGNUP=false`; SSO provisioning is separate from public signup. Restart/redeploy both applications after setting their environment variables.

### 2. Add the Xrynex Trading OS link to the main website

Add a link/button in an authenticated part of the main website, for example **Open Xrynex Trading OS**. Point it to a route handled by the main website's **server**, not directly to the Xrynex Trading OS exchange endpoint. That route should:

1. Require the user's existing main-site session.
2. Create a short-lived HS256 JWT containing these claims:

  | Claim | Requirement |
  | --- | --- |
  | `iss` | Exactly the configured `LEGACY_SSO_ISSUER`. |
  | `aud` | `trading-os`. |
  | `sub` | A stable, non-recycled identifier for the user in the main website. |
  | `email` | The user's normalized email address. |
  | `email_verified` | Boolean `true` only after the main website has verified control of the address. |
  | `name` | Optional display name. |
  | `iat`, `exp` | Integer issue/expiry timestamps; expiry must be no more than 120 seconds after issue. |
  | `jti` | A unique, unguessable identifier for this assertion. |

3. From the server, POST the assertion to `https://<trading-os-host>/api/auth/sso/exchange` with `Authorization: Bearer <assertion>`.
4. On a successful response, immediately redirect the user's browser to the returned `login_url`. It is a one-time URL that expires after 60 seconds and establishes a normal Xrynex Trading OS session cookie.
5. Handle errors safely; do not include the assertion, secret, or login URL in application logs or analytics. Configure reverse-proxy/access logs to redact Authorization headers and one-time `code` query parameters.

The exchange endpoint accepts only HS256 assertions, checks issuer/audience/expiry and verified identity claims, and rejects replayed `jti` values. The one-time login code is consumed atomically by `/api/auth/sso/consume`; it cannot be reused. After a successful handoff, Xrynex Trading OS redirects the user to `/`.

### 3. Handle accounts that already exist in Xrynex Trading OS

If the SSO subject has not been seen before, Xrynex Trading OS creates an account from the verified assertion. If the email already belongs to a password account whose email is not verified, Xrynex Trading OS intentionally rejects automatic linking. Verify the account through a trusted process first, or design an explicit account-linking flow that proves control of both identities. Do not remove this protection or mark accounts verified based only on an untrusted browser request. A user's first successful SSO login can also claim the pre-auth single-user workspace data if that one-time claim has not already occurred.

### 4. Test before production

- Use a separate development/staging issuer and secret; never reuse production secrets in local environments.
- Confirm an unauthenticated visitor cannot start the main-site handoff.
- Confirm a verified test identity lands in Xrynex Trading OS and receives a Xrynex Trading OS session.
- Confirm expired, wrong-issuer, wrong-audience, unverified-email, and replayed assertions are rejected.
- Confirm the handoff returns users to the Xrynex Trading OS dashboard and no token/code is recorded in logs.
- Deploy both sides over HTTPS, synchronize server clocks, and keep the secret rotatable. Rotate it on both sides together if it may have been exposed.

The Xrynex Trading OS implementation lives in `app/api/auth/sso/exchange/route.js` and `app/api/auth/sso/consume/route.js`. The main website's route depends on its framework and session system; implement signing and the exchange request server-side using that stack's JWT library and secret-management facilities.

**Do not replace the Xrynex Trading OS routes with an implementation that stores pending codes in an in-memory `Map` or signs a separate session cookie.** In-memory codes are lost across restarts and are not shared between server instances. Xrynex Trading OS already stores one-time codes and sessions in PostgreSQL, and its pages require the `tradingos_session` cookie issued by its consume route. A separate `SESSION_SECRET` is not used by this app. Configure the shared `LEGACY_SSO_SECRET` securely on both servers instead.
