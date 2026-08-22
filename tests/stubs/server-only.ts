// Vitest (via Vite) doesn't understand Next.js's "react-server" resolve
// condition, so the real `server-only` package (which throws unless that
// condition is set) can't be imported as-is under tests. Aliased in place
// of it from vitest.config.ts — Next's own bundler still enforces the real
// guard in the app itself.
export {};
