// One shared player for recorded clips (Quran words and ayahs), so a new clip stops the last one.
let el: HTMLAudioElement | null = null;

export function playClip(url: string) {
  el ??= new Audio();
  el.pause();
  el.src = url;
  void el.play().catch(() => {});
}

export function stopClip() {
  el?.pause();
}

/** Starts downloading clips so they play straight away later. */
export function preloadClips(urls: readonly string[]) {
  for (const url of new Set(urls)) {
    const a = new Audio();
    a.preload = "auto";
    a.src = url;
  }
}
