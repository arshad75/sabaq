// Sabaq service worker: offline Qaida pages and a few public screens. Signed-in pages,
// personal data and Supabase traffic are never cached.
const VERSION = "sabaq-v5";
const PUBLIC_PAGES = ["/", "/learn", "/practice", "/join", "/listen"];
// The learning path is one page; these let its lessons work with no connection at all.
const PRECACHE = [
  "/learn",
  "/practice",
  "/qaida/01.webp",
  "/qaida/02.webp",
  ...["alif", "ba", "ta", "tha", "jim", "ha", "kha", "dal", "dhal", "ra", "zay", "sin", "shin", "sad", "dad", "tta", "zza", "ayn", "ghayn", "fa", "qaf", "kaf", "lam", "mim", "nun", "waw", "hha", "hamza", "ya"].map(
    (id) => `/audio/letters/${id}.mp3`,
  ),
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const cacheFirst = async (request) => {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) (await caches.open(VERSION)).put(request, response.clone());
  return response;
};

const networkFirst = async (request) => {
  try {
    const response = await fetch(request);
    if (response.ok) (await caches.open(VERSION)).put(request, response.clone());
    return response;
  } catch {
    return (await caches.match(request)) ?? (await caches.match("/practice")) ?? Response.error();
  }
};

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/qaida/") || url.pathname.startsWith("/audio/") || url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
    return;
  }
  if (request.mode === "navigate" && PUBLIC_PAGES.includes(url.pathname) && !url.search) {
    event.respondWith(networkFirst(request));
  }
});
