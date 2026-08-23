<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Родинна історія — private family history app

A private, gated Next.js app: a family tree, per-person biography/burial/gallery pages, and an admin panel for editing everything. No public registration — access is a two-step shared-knowledge gate (a question, then three birth years), separate from the admin login.

This file is read by multiple coding agents (Claude Code, GitHub Copilot, Google Antigravity, ChatGPT/Codex). Keep it tool-agnostic — don't add instructions specific to one tool's UI or slash commands here.

## Stack & commands

- Next.js 16 (App Router), React 19, TypeScript strict, Tailwind CSS v4 (CSS-first `@theme`, no `tailwind.config.js`), pnpm, Zod for all data validation.
- `pnpm dev` — dev server. `pnpm build` — production build. `pnpm start` — run the production build.
- `pnpm lint` — ESLint. `pnpm test` — Vitest unit tests (`tests/unit/`). `pnpm test:e2e` — Playwright e2e (`tests/e2e/`); this rebuilds first (`pretest:e2e`) and runs against `pnpm start`, not `next dev` (dev-mode React StrictMode double-invokes effects and flakes timing-sensitive interactions).
- `pnpm check:deps` — depcheck, for unused-dependency hygiene.
- Always run `pnpm lint`, `pnpm test`, and (for anything touching rendered pages) `pnpm test:e2e` before considering a change done.

## Architecture

- **Data model**: `src/data/{people,relationships,graves,media,questions}.json`, validated by Zod schemas in [src/lib/schemas.ts](src/lib/schemas.ts). `Person.id`/`firstName` are the only required fields — `lastName`, `birthDate`, `deathDate`, `avatar`, `bio` are all optional; display helpers (`initials()`, `lifespan()` in [src/lib/utils.ts](src/lib/utils.ts)) must degrade gracefully when they're missing, not crash.
- **Two data sources**, chosen explicitly in the admin panel and read/written via [src/lib/admin-data.ts](src/lib/admin-data.ts):
  - `local` — the JSON files directly. Only works in local dev; Vercel's production filesystem is read-only, so writes throw there.
  - `global-config` — a single JSON blob in Vercel Global Config. **Reads use the `@vercel/global-config` SDK, not the REST API** — the REST GET's response shape isn't the one Vercel's docs describe (that flat shape is for a different endpoint), and using it broke every admin read in production once already. Writes go through the REST API (`PATCH .../v1/global-config/{id}/items`, `upsert` falling back to `create` on a fresh store) since the SDK is read-only.
  - Every write goes through `validateRawData()` first — per-collection Zod validation, then referential-integrity checks (relationship/grave/media `personId` must reference a real person) that the schemas alone don't enforce.
  - Renaming a person's `id` cascades automatically via `renamePersonId()` to every relationship/grave/media record that references it — this already handles "change a name/surname and the id updates too," no separate mechanism needed.
- **Family tree layout** ([src/lib/family-tree-layout.ts](src/lib/family-tree-layout.ts)): a from-scratch two-pass compact tree algorithm (no third-party tree library) — `computeWidth` (bottom-up: each family unit's real required width) then `place` (top-down: centers each unit within exactly that width). Handles remarriage (children grouped per specific spouse pairing, not pooled) and in-law bridges (a person claimed as a spouse elsewhere must never also be double-processed as a phantom child). If you touch this file, read it in full first — the "claimed" bookkeeping is load-bearing and easy to accidentally break in a way that only shows up as visual overlap, not a type error.
- **Auth**: two independent systems, sharing the generic `createAttemptLockout()` helper in [src/lib/attempt-lockout.ts](src/lib/attempt-lockout.ts) (cookie-backed attempt counter + timed lockout, survives dev-server reloads).
  - Family gate: stage 1 (shared question) → short-lived `family-gate-stage1` cookie → stage 2 (three birth years, any three people) → `family-session`. Each stage has its own independent lockout cookie; failing one doesn't touch the other's counter.
  - Admin: separate `admin-session` cookie, separate credentials (`ADMIN_USERNAME` + `ADMIN_PASSWORD_HASH`, scrypt via Node's built-in `crypto`, no extra dependency), separate lockout.
- **Private photos**: uploads go through Vercel Blob (`access: "private"`), never a public URL — served only via `/api/media/[...pathname]`, which checks `family-session` itself (defense in depth, not just relying on `src/proxy.ts`). Images are resized **at upload time** via Blob's `putImage()` (avatars to 400px, gallery media to 1600px), not via Next's `<Image>` on-demand optimizer — that optimizer fetches server-side without forwarding the browser's session cookie, so it would get a 401 from the private media route. Every `<Image>` rendering one of these URLs is `unoptimized` deliberately, not by oversight.
- **`src/proxy.ts`** replaces `middleware.ts` in this Next.js version. It's the single gate for both auth systems — read it in full before changing routing/auth, since a wrong branch order here can leak private routes.

## Conventions

- Maximize Server Components. Client components (`"use client"`) live only in `src/components/client/` and only when they truly need browser APIs, refs, or interactivity (the tree canvas, pan/zoom, login forms with countdown timers).
- No inline `style={{...}}` — Tailwind theme tokens / `@layer components` classes only, except genuinely imperative per-frame DOM manipulation (the tree's pan/zoom transform).
- All user-facing text is Ukrainian; keep new strings consistent with the existing tone (`messages/uk.json` for anything routed through `next-intl`).
- Server Actions return a typed state object (`{status, ...}` or `{error?}`) consumed via `useActionState`, not thrown exceptions surfaced as Next error pages, for anything a user can retry (forms, login).

## Known gotchas (read before debugging these symptoms)

- **A `$`-containing env var value gets silently mangled to empty.** Next's `@next/env` dotenv-expand pass treats `$something` as a variable reference, in *any* env source (`.env.local`, shell-exported, Playwright's `webServer.env`) — not just `.env.local`. This is why the admin password hash format is `scrypt:salt:hash` (colons), not `scrypt$salt$hash`.
- **A `disabled` form field submits nothing.** Native `FormData` excludes disabled inputs/selects entirely. If a field needs to be visually locked but still submit its value (e.g. "can't change which person a grave belongs to"), disable the visible control and add a parallel `<input type="hidden">` carrying the real value — don't just `disabled` the field that holds the value you need.
- **Windows-only Playwright flake**: `admin-crud.spec.ts`'s local-file round-trip occasionally hits `EPERM: operation not permitted, rename ...json.tmp -> ...json` — a file-lock race in the atomic write-then-rename, worse under `--workers` > 1 since multiple tests write `src/data/*.json` concurrently. Rerun (optionally with `--workers=1`) before assuming a real regression.
- **`gate-years.spec.ts`'s lockout test occasionally times out** waiting for the lockout message — a React 19 form-action auto-reset race (uncontrolled inputs get cleared on the same render that resolves the previous submission, which can race a same-turn `fill()`). Confirmed as a pre-existing timing flake, not a schema/logic bug — rerun in isolation to confirm before treating it as a regression.
- **After any e2e run**, check `git status --short src/data/` — the local-file write path can leave stray `*.tmp` files (from an interrupted run) or CRLF/LF-only diffs (from the write-then-rewrite roundtrip) even when nothing meaningful changed. Delete strays and `git checkout -- src/data/` cosmetic-only diffs before committing; verify a diff is truly cosmetic by comparing `JSON.parse` output, not just eyeballing it.

## Environment variables

- `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH` — admin login. Generate the hash with `node scripts/hash-admin-password.mjs "password"`.
- `GLOBAL_CONFIG` — enables the Global Config data source for the public site's reads.
- `VERCEL_API_TOKEN`, `VERCEL_GLOBAL_CONFIG_STORE_ID`, optional `VERCEL_TEAM_ID` — needed only for the admin panel's Global Config *writes* (REST API, not the SDK).
- A private Vercel Blob store connected to the project auto-provides `BLOB_READ_WRITE_TOKEN` for photo uploads — nothing to set by hand.
- After changing any env var on Vercel, redeploy — an existing deployment doesn't pick up changes retroactively.

## Local code review (CodeRabbit CLI, optional)

[CodeRabbit CLI](https://docs.coderabbit.ai/cli) can review a diff locally before it's pushed — free, separate from CodeRabbit's PR-comment rate limits. It's optional tooling, not a required dependency: nothing in the repo assumes it's installed, and `pnpm install` never touches it.

**One-time setup (each contributor runs this themselves — installing a binary and logging into a personal account isn't something to script or delegate):**

1. Install the CLI:
   - Windows (PowerShell): `irm https://cli.coderabbit.ai/install.ps1 | iex`
   - macOS/Linux: `curl -fsSL https://cli.coderabbit.ai/install.sh | sh`
   - or via Homebrew: `brew install coderabbit`
2. Authenticate: `cr auth login` (opens a browser; `--region eu` if your org is EU-hosted).
3. Opt into the repo's pre-commit hook (per clone, not global — this repo doesn't force it on anyone): `git config core.hooksPath .githooks`

Once set up, every `git commit` runs [.githooks/pre-commit](.githooks/pre-commit), which reviews staged changes with `cr review --uncommitted --plain` and prints findings to the terminal — **informational only, it never blocks the commit** (skips silently if the CLI isn't installed/authenticated). Run it manually anytime with `pnpm review`, or on a full branch diff with `cr --base master`.

