import { describe, expect, it, vi } from "vitest";
import { letterFor, speakLetter } from "./letters";
import { qaidaCells } from "./layout";

describe("Qaida letter names", () => {
  it("names every letter box on page 1 except the decorative flower", () => {
    const grid = qaidaCells(1).filter((c) => c.line >= 2);
    const unnamed = grid.filter((c) => !letterFor(1, c)).map((c) => c.id);
    expect(unnamed).toEqual(["3:1"]);
    expect(letterFor(1, { id: "2:1" })?.en).toBe("Alif");
    expect(letterFor(1, { id: "6:4" })?.en).toBe("Ghayn");
  });

  it("never throws, even where speech isn't available", () => {
    expect(() => speakLetter({ id: "alif", ar: "x" })).not.toThrow();
  });

  it("plays the bundled clip when the device has no Arabic voice", () => {
    const played: string[] = [];
    vi.stubGlobal("window", globalThis);
    vi.stubGlobal("speechSynthesis", { getVoices: () => [{ lang: "en-GB", name: "English" }] });
    vi.stubGlobal(
      "Audio",
      class {
        constructor(public src: string) {}
        play() {
          played.push(this.src);
          return Promise.resolve();
        }
        pause() {}
      },
    );
    expect(speakLetter({ id: "ba", ar: "x" })).toBe(true);
    expect(played).toEqual(["/audio/letters/espeak/ba.mp3"]);
    vi.unstubAllGlobals();
  });

  it("falls back to the clip when the device's voice accepts speech but never starts", async () => {
    vi.resetModules();
    const fresh = await import("./letters");
    vi.useFakeTimers();
    const played: string[] = [];
    vi.stubGlobal("window", globalThis);
    vi.stubGlobal("speechSynthesis", {
      getVoices: () => [{ lang: "ar-SA", name: "Arabic", localService: true }],
      speak: () => {},
      cancel: () => {},
      resume: () => {},
      paused: false,
      speaking: false,
      pending: false,
    });
    vi.stubGlobal("SpeechSynthesisUtterance", class {
      onstart: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(public text: string) {}
    });
    vi.stubGlobal(
      "Audio",
      class {
        constructor(public src: string) {}
        play() {
          played.push(this.src);
          return Promise.resolve();
        }
        pause() {}
      },
    );
    expect(fresh.speakLetter({ id: "dal", ar: "x" })).toBe(true);
    expect(played).toEqual([]);
    vi.advanceTimersByTime(1000);
    expect(played).toEqual(["/audio/letters/espeak/dal.mp3"]);
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
});
