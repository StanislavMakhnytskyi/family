import { ImageResponse } from "next/og";

// iOS fills a transparent apple-touch-icon with black before rounding its
// corners, so this fills the full square with the page's cream background
// instead of leaving it transparent. The mark itself is the same SVG as
// icon.svg, embedded as a data URI -- satori (the renderer behind
// ImageResponse) can't render arbitrary <path> curves directly via JSX, but
// it does support <img> with a data: URI.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const MARK_SVG = `<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <g fill="none" stroke-linecap="round">
    <path d="M15,178 C15,95 65,95 65,178" stroke="#FFD500" stroke-width="16" />
    <path d="M135,178 C135,95 185,95 185,178" stroke="#FFD500" stroke-width="16" />
    <path d="M70,178 C70,58 130,58 130,178" stroke="#005BBB" stroke-width="16" />
  </g>
  <circle cx="40" cy="88" r="12" fill="#FFD500" />
  <circle cx="160" cy="88" r="12" fill="#FFD500" />
  <circle cx="100" cy="50" r="15" fill="#005BBB" />
</svg>`;

const MARK_DATA_URI = `data:image/svg+xml;base64,${Buffer.from(MARK_SVG).toString("base64")}`;

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f6f0e4",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse (satori) needs a plain <img>, not next/image */}
        <img src={MARK_DATA_URI} width={140} height={140} alt="" />
      </div>
    ),
    { ...size },
  );
}
