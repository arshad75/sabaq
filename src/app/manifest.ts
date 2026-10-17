import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sabaq · Read together",
    short_name: "Sabaq",
    description: "Shared reading for remote Quran and Qaida lessons between a teacher and a child.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f7f5",
    theme_color: "#0f6b5f",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
    shortcuts: [
      { name: "Learn the letters", url: "/learn" },
      { name: "Join a lesson", url: "/join" },
      { name: "Practise the Qaida", url: "/practice" },
    ],
  };
}
