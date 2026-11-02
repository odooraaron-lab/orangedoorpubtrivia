import type { MetadataRoute } from "next";

// Lets customers add the portal to their phone's home screen and open it like an app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/portal",
    name: "Orange Door Pub Trivia",
    short_name: "Pub Trivia",
    description: "Your Orange Door Pub Trivia games: the PowerPoint and printable PDFs.",
    start_url: "/portal",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#0d0d0d",
    theme_color: "#0d0d0d",
    categories: ["entertainment", "games"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
