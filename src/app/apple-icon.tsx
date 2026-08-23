import { ImageResponse } from "next/og";

// iOS fills a transparent apple-touch-icon with black before rounding its
// corners, so unlike icon.tsx this fills the full square with the page's
// cream background instead of leaving it transparent.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

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
        <div
          style={{
            width: 128,
            height: 128,
            borderRadius: "50%",
            background: "#f7f0e0",
            border: "4px solid #d9cdb2",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "#9c6446",
            }}
          />
        </div>
      </div>
    ),
    { ...size },
  );
}
