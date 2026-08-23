import "server-only";
import { flag } from "flags/next";
import { get as getEdgeConfigValue } from "@vercel/edge-config";

// Runs this deployment as the public, safe-to-share demo build instead of
// the real app: English locale, a fictional dataset with public stock
// photos, the admin panel fully unreachable, and the gate letting anyone
// through without needing the real family's answer.
//
// decide() checks Edge Config first, so once an Edge Config store is
// connected to the project this becomes toggleable from the Vercel
// dashboard / Flags Explorer with no redeploy -- and falls back to the
// plain DEMO_MODE env var when Edge Config isn't set up, so this works with
// zero extra setup on day one.
export const demoModeFlag = flag<boolean>({
  key: "demo-mode",
  description:
    "Runs this deployment as the public demo build: English locale, fictional data with stock photos, admin panel disabled, gate accepts any answer.",
  options: [
    { value: false, label: "Off — real app" },
    { value: true, label: "On — public demo" },
  ],
  decide: async () => {
    if (process.env.EDGE_CONFIG) {
      try {
        const value = await getEdgeConfigValue<boolean>("demo-mode");
        if (typeof value === "boolean") return value;
      } catch {
        // Edge Config unreachable/misconfigured -- fall through to the env var.
      }
    }
    return process.env.DEMO_MODE === "true";
  },
});
