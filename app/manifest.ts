import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Court – Gemeinsam Zeit finden",
    short_name: "Court",
    description: "Verfügbarkeiten teilen und gemeinsame Court-Zeiten finden.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f3f4f6",
    theme_color: "#ffffff",
    categories: ["sports", "productivity", "social"],
    icons: [
      {
        src: "/icon_1024.png",
        sizes: "1024x1024",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon_1024.png",
        sizes: "1024x1024",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}