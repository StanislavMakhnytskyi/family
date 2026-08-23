# Родинна історія (Family History)

A private family archive: a family tree, per-person pages with biography, burial place, and photo gallery. Access is protected by a two-step gate (no registration): a shared question, then the birth years of three family members.

## Tech stack

- Next.js 16 (App Router) + React 19, TypeScript (strict)
- Tailwind CSS v4 + custom shadcn-styled components (Radix UI under the hood)
- Custom compact layout algorithm for the tree (`src/lib/family-tree-layout.ts`) — no third-party tree library
- `next-intl` — internationalization (only `uk` is active for now, structure ready for other languages)
- `zod` — JSON data validation
- `vitest` — unit tests, `@playwright/test` — smoke tests
- `@vercel/analytics` — basic visit analytics (page views only, no PII); only active on a real Vercel deployment, sends nothing in `pnpm dev`/local `pnpm start`

## Getting started

Requires [pnpm](https://pnpm.io) (`corepack enable` will install it automatically if it isn't already).

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) — it should redirect to `/gate`. See [src/data/questions.json](src/data/questions.json) for the correct answers.

## Other commands

```bash
pnpm build       # production build
pnpm start       # run the production build
pnpm lint        # ESLint
pnpm test        # unit tests (vitest)
pnpm test:e2e    # smoke tests (playwright; first run: pnpm exec playwright install chromium)
pnpm review      # local AI review of staged changes via CodeRabbit CLI (optional, see AGENTS.md)
pnpm migrate:avatars  # re-encodes legacy (pre-migration) avatars into compact small/large variants (needs .env.local with real Blob credentials)
```

## Data

All content lives in JSON files under [src/data/](src/data/), validated by Zod schemas in [src/lib/schemas.ts](src/lib/schemas.ts):

- `people.json` — people (`id`, `firstName` required; `lastName`, `birthDate`, `deathDate`, paragraph biography, photo — all optional)
- `relationships.json` — `parent-child` links (person1Id = parent, person2Id = child) and `spouse` links
- `graves.json` — burial places (coordinates, address)
- `media.json` — photo gallery per person
- `questions.json` — login questions (`normalizedAnswer` + optional `variants`)

To add a new person, either edit these files by hand, or use the admin panel (below) — pages and the tree pick up changes automatically. Photos aren't required: if `avatar` is unset, an initials placeholder is shown instead.

Data can live either locally in these files, or as a single object in Vercel Global Config — see [scripts/push-global-config.mjs](scripts/push-global-config.mjs) for pushing local files there.

## Admin panel

`/admin` — a separate panel, protected by its own login/password, for editing all five collections through forms (no manual JSON editing needed). On login you explicitly pick a data source — local files (dev only, Vercel's production filesystem is read-only) or Vercel Global Config.

Required environment variables for the admin panel:

- `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH` — admin login. Generate the hash with `node scripts/hash-admin-password.mjs "password"` (format is `scrypt:salt:hash` — colons, not `$`, because Next's `.env` loader mangles unescaped `$` values via dotenv-expand)

Needed only for the Vercel Global Config source (writes go through the REST API, not the SDK):

- `VERCEL_API_TOKEN` — a personal token with write access, scoped to the account/team that owns the Global Config store
- `VERCEL_GLOBAL_CONFIG_STORE_ID` — the store id (`ecfg_...`), `vercel global-config ls`
- `VERCEL_TEAM_ID` — only if the store belongs to a team, not a personal account

Photo uploads need a private Vercel Blob store connected to the project (Storage → Create Database → Blob → Access: Private) — this automatically adds `BLOB_READ_WRITE_TOKEN`, nothing to set by hand. Photos go through [`putImage`](https://vercel.com/docs/storage/vercel-blob) (on-the-fly optimization/resizing on upload: avatars are stored at two sizes — 160px for the tree/relative cards and 480px for the person page, media up to 1600px), rather than Next's `<Image>` optimizer — that makes its request to the source server-side without the browser's cookies, and `/api/media/...` requires a session cookie, so the optimizer would just get a 401.

After changing any environment variable on Vercel, redeploy — an already-deployed build doesn't pick up changes retroactively.

## Structure

```
src/
  app/            — routes (App Router), Server Actions (app/actions, app/admin/actions)
  components/
    ui/            — base primitives (button, input, card, avatar, select, textarea, skeleton)
    client/        — interactive "use client" components (tree, login forms)
  lib/            — Zod schemas, data read/write, utilities, session/cookies, tree layout
  data/           — sample data (JSON)
  i18n/           — next-intl configuration
messages/         — translations (uk.json, en.json)
src/proxy.ts      — session cookie checks (replaces middleware.ts in this Next.js version)
```

## Security

- Every page except `/gate` and `/gate/years` has `noindex`; `public/robots.txt` disallows indexing entirely.
- The `family-session` cookie is HttpOnly, Secure, SameSite=Lax, 7 days.
- Login is two steps, each with its own independent attempt limit (3, then a 15-minute lockout): the shared question (`family-gate-attempts`), then three family members' birth years (`family-gate-years-attempts`). Failing the second step doesn't affect the first step's counter, and vice versa.
- The admin panel has its own session (`admin-session`) and its own attempt limit, fully separate from the family login.
