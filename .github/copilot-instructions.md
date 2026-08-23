# Copilot instructions

Read [AGENTS.md](../AGENTS.md) at the repo root first — it's the canonical, tool-agnostic source of project context (stack, architecture, conventions, known gotchas, env vars) and is kept up to date. This file exists only because some Copilot surfaces (Chat, inline suggestions) read `.github/copilot-instructions.md` specifically rather than `AGENTS.md`.

Highlights, if you can't load AGENTS.md:

- Next.js 16 App Router + React 19 + TypeScript strict + Tailwind v4, pnpm. Run `pnpm lint`, `pnpm test`, and `pnpm test:e2e` before calling anything done.
- Maximize Server Components; `"use client"` only inside `src/components/client/`.
- All data lives in `src/data/*.json`, Zod-validated via [src/lib/schemas.ts](../src/lib/schemas.ts). Only `Person.id`/`firstName` are required — everything else must degrade gracefully when absent.
- Native `FormData` drops `disabled` fields entirely — if a field must be visually locked but still submit its value, pair it with a hidden input, don't rely on the disabled control's own value.
- Photos are private (Vercel Blob, resized at upload time via `putImage`), served only through `/api/media/...` behind the session cookie — never make an avatar/media URL public.
- Full detail, including the family-tree layout algorithm's invariants and the two-stage login/lockout design, is in AGENTS.md.
