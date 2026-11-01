import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "DEENO – Chauffeur- & Limousinenservice";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const root = process.cwd();
  const [serif, sans, photo] = await Promise.all([
    readFile(join(root, "src/assets/fonts/CormorantGaramond-Regular.ttf")),
    readFile(join(root, "src/assets/fonts/Manrope-SemiBold.ttf")),
    readFile(join(root, "src/assets/images/og-base.jpg")),
  ]);
  const src = `data:image/jpeg;base64,${photo.toString("base64")}`;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "#090909" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" width={1200} height={630} style={{ position: "absolute", inset: 0, objectFit: "cover" }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", background: "linear-gradient(90deg, rgba(9,9,9,0.95) 0%, rgba(9,9,9,0.7) 45%, rgba(9,9,9,0.1) 100%)" }} />
        <div style={{ position: "relative", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 80px", width: "100%" }}>
          <div style={{ fontFamily: "Cormorant", fontSize: 120, letterSpacing: 40, color: "#F5F2EC", lineHeight: 1 }}>DEENO</div>
          <div style={{ display: "flex", alignItems: "center", marginTop: 22 }}>
            <div style={{ width: 48, height: 2, background: "#C6A66B", marginRight: 18 }} />
            <div style={{ fontFamily: "Manrope", fontSize: 22, letterSpacing: 7, color: "#C6A66B" }}>CHAUFFEUR- &amp; LIMOUSINENSERVICE</div>
          </div>
          <div style={{ fontFamily: "Cormorant", fontSize: 52, color: "#F5F2EC", marginTop: 56, maxWidth: 620, lineHeight: 1.1 }}>Exklusivität beginnt mit Ihrer Fahrt.</div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Cormorant", data: serif, weight: 400, style: "normal" },
        { name: "Manrope", data: sans, weight: 600, style: "normal" },
      ],
    },
  );
}
