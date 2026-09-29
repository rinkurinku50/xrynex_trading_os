# File map

Every file in the project and what it does. Start at `README.md` for setup, or open
`preview/index.html` in a browser to see the design with no install at all.

## Root

| File | Purpose |
| --- | --- |
| `README.md` | Setup steps, Google Drive instructions, API reference |
| `FILE-MAP.md` | This file |
| `package.json` | Next.js app scripts and Prisma dependencies |
| `.env.example` | Copy to `.env` and set `DATABASE_URL` |
| `.gitignore` | Ignores `node_modules`, `.next`, `.env` |
| `next.config.mjs` | Allows Drive image hosts |
| `tailwind.config.js` | The dark palette (`ink`, `panel`, `line`, `win`, `loss`, `be`…) and fonts |
| `postcss.config.js` | Tailwind + autoprefixer |
| `jsconfig.json` | Makes `@/lib/...` and `@/components/...` imports resolve |

## `preview/`

| File | Purpose |
| --- | --- |
| `index.html` | Standalone static preview of the dashboard. No build, no database — double-click it |

## `prisma/`

| File | Purpose |
| --- | --- |
| `schema.prisma` | Prisma schema for all app tables and the PostgreSQL datasource |

## `scripts/`

| File | Purpose |
| --- | --- |
| `setup-db.mjs` | Syncs the Prisma schema and optionally loads sample rows |
| `seed-prisma.mjs` | Creates the demo workspace dataset in the database |

## `lib/` — data layer

| File | Purpose |
| --- | --- |
| `db.js` | Prisma client singleton plus compatibility helpers |
| `queries.js` | Every read the workspace pages need |
| `drive.js` | Parses any Google Drive share link into a file ID, then builds the thumbnail URL (images), the `/preview` URL (videos) and the plain open-in-Drive URL |

## `app/api/` — REST routes

Each collection route handles `GET` (list) and `POST` (create); each `[id]` route handles `PATCH` (update) and `DELETE`. Writes only accept whitelisted columns and use Prisma model operations.

| Route | File |
| --- | --- |
| `/api/ideas` | `app/api/ideas/route.js`, `app/api/ideas/[id]/route.js` (supports `?tag=Question`) |
| `/api/strategies` | `app/api/strategies/route.js`, `app/api/strategies/[id]/route.js` |
| `/api/videos` | `app/api/videos/route.js`, `app/api/videos/[id]/route.js` |
| `/api/charts` | `app/api/charts/route.js`, `app/api/charts/[id]/route.js` (validates the Drive link) |
| `/api/tasks` | `app/api/tasks/route.js`, `app/api/tasks/[id]/route.js` |
| `/api/concepts` | `app/api/concepts/route.js` — list and create concepts |
| `/api/concepts/:id` | `app/api/concepts/[id]/route.js` — edit and delete concepts |
| `/api/focus` | `app/api/focus/route.js` — the Current Focus card, `GET` and `PATCH` |

## `app/` — pages

| URL | File | What it shows |
| --- | --- | --- |
| `/` | `app/page.jsx` | Dashboard with quick actions, today's checklist, recent videos, strategies, concepts, ideas, playbook, and Recent charts at the bottom |
| `/daily-tasks` | `app/daily-tasks/page.jsx` | Full task planner with priority, defer, removal, and task-history tabs |
| `/trading-plan` | `app/trading-plan/page.jsx` | Trading Plan page with the persistent current-week economic calendar screenshot |
| `/login`, `/signup` | `app/login/page.jsx`, `app/signup/page.jsx` | Credential authentication pages |
| `/ideas` | `app/ideas/page.jsx` | Idea inbox with status filter |
| `/questions` | `app/questions/page.jsx` | The same board, filtered to questions |
| `/strategies` | `app/strategies/page.jsx` | Strategy cards and workflow status |
| `/videos` | `app/videos/page.jsx` | Drive videos playing inline |
| `/charts` | `app/charts/page.jsx` | Drive screenshots in a grid |
| `/concepts` | `app/concepts/page.jsx` | Database-backed Knowledge Base with detail dialogs and CRUD controls |
| `/archive` | `app/archive/page.jsx` | Dropped ideas |
| `/tutorial` | `app/tutorial/page.jsx` | Tabbed, step-by-step guide to each workspace section and workflow |
| — | `app/layout.jsx` | Sidebar shell wrapping every page |
| — | `app/globals.css` | Tailwind layers plus the `.panel`, `.btn`, `.field`, `.badge` classes |

## `components/`

| File | Type | Purpose |
| --- | --- | --- |
| `Sidebar.jsx` | client | Navigation with live filtering as you type in the search box |
| `ui.jsx` | shared | `Panel`, `Badge`, `Empty`, date helpers |
| `Form.jsx` | client | `Modal`, `RecordForm` (generic create/edit form driven by field definitions), `DeleteButton` |
| `NewButton.jsx` | client | `fieldSets` — the field definitions for every record type — and the button that opens the right form |
| `TodayTasks.jsx` | client | Checklist with optimistic toggles and inline add |
| `DailyTaskManager.jsx` | client | Daily Tasks page planner with Today, Pending, Upcoming, Completed, and Removed tabs |
| `EconomicCalendarCard.jsx` | client | Saves and previews this week's economic calendar image link |
| `DriveMedia.jsx` | client | `DriveImage` (with the not-shared fallback) and `DriveVideo` (Drive's iframe player) |
| `IdeaBoard.jsx` | client | Shared by `/ideas` and `/questions`: status filter and inline status change |
| `KnowledgeBase.jsx` | client | Concept cards with detailed dialogs, editing, and deletion |
| `StrategyLab.jsx` | client | Strategy cards with editing and the show-in-navigation setting |
| `AuthForm.jsx`, `AccountMenu.jsx` | client | Login/signup form and authenticated account logout control |

## Where to make common changes

| I want to… | Edit |
| --- | --- |
| Change colours | `tailwind.config.js`, and the `:root` block in `preview/index.html` |
| Make Drive images sharper | the `sz=w1200` in `lib/drive.js` |
| Add a new record type | the Prisma schema, a route pair under `app/api/`, a field set in `NewButton.jsx`, a page under `app/` |
