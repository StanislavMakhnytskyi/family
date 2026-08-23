import { createFlagsDiscoveryEndpoint, getProviderData } from "flags/next";
import * as flags from "@/lib/flags";

// Lets Vercel's Flags Explorer discover this project's flags. Access is
// gated by FLAGS_SECRET (auto-provisioned once you open the Flags tab on
// the Vercel dashboard for this project) -- createFlagsDiscoveryEndpoint
// handles that check itself.
export const GET = createFlagsDiscoveryEndpoint(async () => getProviderData(flags));
