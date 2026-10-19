import { existsSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ALPHABET, letterFor, readingFor, speakLetter } from "./letters";
import { qaidaCells } from "./layout";

describe("Qaida letter names", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });
  it("names every letter box on page 1 except the decorative flower", () => {
    const grid = qaidaCells(1).filter((c) => c.line >= 2);
    const unnamed = grid.filter((c) => !letterFor(1, c)).map((c) => c.id);
    expect(unnamed).toEqual(["3:1"]);
    expect(letterFor(1, { id: "2:1" })?.en).toBe("Alif");
    expect(letterFor(1, { id: "6:4" })?.en).toBe("Ghayn");
  });

  it("spells out every letter and joined-letter box on pages 1–6", () => {
    // Fewer than these means a reading points at a box that doesn't exist on the page.
    const expected: Record<number, number> = { 1: 19, 2: 72, 3: 38, 4: 43, 5: 41, 6: 13 };
    for (const [page, n] of Object.entries(expected)) {
      const named = qaidaCells(Number(page)).filter((c) => readingFor(Number(page), c));
      expect(named.length, `page ${page}`).toBe(n);
      for (const c of named) expect(readingFor(Number(page), c)!.every(Boolean)).toBe(true);
    }
    const say = (page: number, id: string) => readingFor(page, { id })?.map((l) => l.en).join(" ");
    expect(say(4, "3:5")).toBe("Ya Ta Lam");
    expect(say(3, "3:1")).toBe("Lam Alif");
    expect(say(2, "9:4")).toBe("Dal");
    expect(say(7, "2:1")).toBeUndefined();
    expect(letterFor(4, { id: "3:5" })).toBeUndefined();
  });

  it("has a recording for every letter, since nothing else speaks", () => {
    const missing = ALPHABET.filter((l) => !existsSync(join(__dirname, "../../../public/audio/letters", `${l.id}.mp3`)));
    expect(missing.map((l) => l.id)).toEqual([]);
  });

  it("never throws, even where audio isn't available", () => {
    expect(() => speakLetter({ id: "alif" })).not.toThrow();
  });

  it("spells a joined word as one phrase: each name starts as the last one fades", async () => {
    vi.stubEnv("NEXT_PUBLIC_RECORDED_LETTERS", "ya,ta");
    vi.resetModules();
    const fresh = await import("./letters");
    const starts: [number, number, number][] = [];
    const fetched: string[] = [];
    // 1 s clips: quiet lead-in, the name, then a fading tail.
    const samples = new Float32Array(1000);
    samples.fill(0.5, 200, 600);
    samples.fill(0.1, 600, 800);
    const param = { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() };
    vi.stubGlobal("window", globalThis);
    vi.stubGlobal("Audio", class {});
    vi.stubGlobal("fetch", async (url: string) => {
      fetched.push(url);
      return { ok: true, arrayBuffer: async () => new ArrayBuffer(1) };
    });
    vi.stubGlobal(
      "AudioContext",
      class {
        state = "running";
        currentTime = 0;
        destination = {};
        decodeAudioData = async () => ({ sampleRate: 1000, getChannelData: () => samples });
        createGain = () => ({ gain: param, connect: () => {} });
        createBufferSource = () => ({
          connect: () => {},
          stop: () => {},
          start: (when: number, from: number, len: number) => starts.push([when, from, len]),
        });
      },
    );

    expect(fresh.speakLetters([{ id: "ya" }, { id: "ta" }])).toBe(true);
    await vi.waitFor(() => expect(starts).toHaveLength(2));
    expect(fetched).toEqual(["/audio/letters/ya.mp3", "/audio/letters/ta.mp3"]);
    const [[t1, from, len], [t2, , lastLen]] = starts;
    expect(from).toBeCloseTo(0.18);
    expect(len).toBeCloseTo(0.47);
    // The second name begins inside the first one's fade, and keeps its own natural ending.
    expect(t2 - t1).toBeCloseTo(0.4);
    expect(lastLen).toBeCloseTo(0.635);
  });

  it("plays only the recordings, one letter after another, never the device's voice", async () => {
    vi.useFakeTimers();
    vi.stubEnv("NEXT_PUBLIC_RECORDED_LETTERS", "ba,ta,lam");
    vi.resetModules();
    const fresh = await import("./letters");
    const played: string[] = [];
    const clips: { onended: (() => void) | null }[] = [];
    const speak = vi.fn();
    let fail = false;
    vi.stubGlobal("window", globalThis);
    vi.stubGlobal("speechSynthesis", { speak, getVoices: () => [] });
    vi.stubGlobal(
      "Audio",
      class {
        onended: (() => void) | null = null;
        constructor(public src: string) {
          clips.push(this);
        }
        play() {
          played.push(this.src);
          return fail ? Promise.reject(new Error("offline")) : Promise.resolve();
        }
        pause() {}
      },
    );

    expect(fresh.speakLetter({ id: "ba" })).toBe(true);
    expect(played).toEqual(["/audio/letters/ba.mp3"]);
    expect(fresh.speakLetter({ id: "unrecorded" })).toBe(false);
    expect(fresh.speakLetters([{ id: "ba" }, { id: "unrecorded" }])).toBe(false);
    expect(played).toHaveLength(1);

    played.length = 0;
    expect(fresh.speakLetters([{ id: "ba" }, { id: "ta" }, { id: "lam" }])).toBe(true);
    expect(played).toEqual(["/audio/letters/ba.mp3"]);
    clips.at(-1)!.onended!();
    await vi.runAllTimersAsync();
    expect(played).toEqual(["/audio/letters/ba.mp3", "/audio/letters/ta.mp3"]);
    // A new tap stops the word being spelled.
    const stale = clips.at(-1)!;
    fresh.speakLetter({ id: "lam" });
    stale.onended!();
    await vi.runAllTimersAsync();
    expect(played).toEqual(["/audio/letters/ba.mp3", "/audio/letters/ta.mp3", "/audio/letters/lam.mp3"]);

    fail = true;
    const onFail = vi.fn();
    fresh.speakLetter({ id: "ba" }, onFail);
    await vi.runAllTimersAsync();
    expect(onFail).toHaveBeenCalledOnce();
    expect(speak).not.toHaveBeenCalled();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });
});
