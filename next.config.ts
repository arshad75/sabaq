import { existsSync, readdirSync } from "node:fs";
import type { NextConfig } from "next";

// Only letters whose recording is actually in this build play it; others use the voice fallbacks.
const lettersDir = "public/audio/letters";
const recordedLetters = existsSync(lettersDir)
  ? readdirSync(lettersDir).filter((f) => f.endsWith(".mp3")).map((f) => f.slice(0, -4))
  : [];

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_RECORDED_LETTERS: recordedLetters.join(",") },
  cacheComponents: true,
  partialPrefetching: true,
  // The corner badge covered the reading view's page buttons; errors still show without it.
  devIndicators: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
