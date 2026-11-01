import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DEENO Chauffeur- & Limousinenservice",
    short_name: "DEENO",
    start_url: "/",
    display: "browser",
    background_color: "#090909",
    theme_color: "#090909",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
