import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Lumina — Cleaner Cars. Brighter Days.",
    short_name: "Lumina",
    description:
      "Compare verified car wash partners in Accra, see prices, and book a time that fits your day.",
    start_url: "/",
    display: "standalone",
    background_color: "#FAF8F2",
    theme_color: "#FAF8F2",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
