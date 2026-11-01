import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#090909" }}>
        <div style={{ fontSize: 104, color: "#F5F2EC", fontFamily: "serif", lineHeight: 1 }}>D</div>
        <div style={{ width: 70, height: 3, background: "#C6A66B", marginTop: 10 }} />
      </div>
    ),
    size,
  );
}
