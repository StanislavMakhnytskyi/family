import { ImageResponse } from "next/og";

// Matches the LogoMark component (src/components/SiteHeader.tsx): a bordered
// circle badge with a smaller solid terracotta dot -- same shape used in the
// header and on the gate screen, so the browser tab icon reads as the same
// mark rather than Next.js's default globe.
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: "50%",
            background: "#f7f0e0",
            border: "1px solid #d9cdb2",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
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
