// Spoken labels for young children on child-facing screens, using the device's own voice.
let englishVoice: SpeechSynthesisVoice | null | undefined;

function pickEnglishVoice(): SpeechSynthesisVoice | null | undefined {
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return undefined;
  const en = voices.filter((v) => v.lang.toLowerCase().startsWith("en"));
  return en.find((v) => v.localService && v.default) ?? en.find((v) => v.localService) ?? en[0] ?? null;
}

export function canSpeak(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Says a short English phrase; quietly does nothing where speech isn't available. */
export function sayLabel(text: string): void {
  if (!canSpeak() || !text.trim()) return;
  const synth = window.speechSynthesis;
  if (englishVoice === undefined) englishVoice = pickEnglishVoice();
  if (synth.paused) synth.resume();
  if (synth.speaking || synth.pending) synth.cancel();
  const u = new SpeechSynthesisUtterance(text.trim().slice(0, 120));
  u.lang = englishVoice?.lang ?? "en-GB";
  if (englishVoice) u.voice = englishVoice;
  u.rate = 0.95;
  synth.speak(u);
}

/** The words a control would be read out as: its accessible label, or its visible text. */
export function labelOf(el: Element): string {
  const own = el.getAttribute("aria-label") ?? el.getAttribute("title");
  return (own ?? el.textContent ?? "").replace(/\s+/g, " ").trim();
}
