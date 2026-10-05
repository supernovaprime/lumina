import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Lumina — Cleaner Cars. Brighter Days.",
    short_name: "Lumina",
    description:
      "Book trusted car washes near you in minutes. Compare services, pick a slot, drive away clean.",
    start_url: "/",
    display: "standalone",
    background_color: "#001219",
    theme_color: "#001219",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
