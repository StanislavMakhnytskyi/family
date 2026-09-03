import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Server Actions cap request bodies at 1MB by default -- too small for a
  // photo upload through the admin panel's Server Actions (savePerson's
  // avatar, saveMedia's file). Raised to cover a typical phone photo;
  // uploaded images are still re-encoded/resized down at upload time via
  // Vercel Blob's putImage() (see src/lib/blob.ts), so this only affects
  // what's accepted on the way in, not what's stored.
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  images: {
    formats: ["image/avif", "image/webp"],
    // Only ever referenced by the demo dataset (src/data/demo/), which uses
    // public stock-photo URLs instead of the real family's private Blob
    // storage -- the real app's own images always go through
    // /api/media/... instead. Every <Image> using these is `unoptimized`
    // regardless, but next/image validates remote `src` hosts either way.
    remotePatterns: [
      { protocol: "https", hostname: "randomuser.me" },
      { protocol: "https", hostname: "picsum.photos" },
    ],
  },
};

export default withNextIntl(nextConfig);
