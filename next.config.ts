import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
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
