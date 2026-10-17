import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { ALPHABET, letterFor, speakLetter } from "./letters";
import { qaidaCells } from "./layout";

describe("Qaida letter names", () => {
  it("names every letter box on page 1 except the decorative flower", () => {
    const grid = qaidaCells(1).filter((c) => c.line >= 2);
    const unnamed = grid.filter((c) => !letterFor(1, c)).map((c) => c.id);
    expect(unnamed).toEqual(["3:1"]);
    expect(letterFor(1, { id: "2:1" })?.en).toBe("Alif");
    expect(letterFor(1, { id: "6:4" })?.en).toBe("Ghayn");
  });

  it("has a recording for every letter, since nothing else speaks", () => {
    const missing = ALPHABET.filter((l) => !existsSync(join(__dirname, "../../../public/audio/letters", `${l.id}.mp3`)));
    expect(missing.map((l) => l.id)).toEqual([]);
  });

  it("never throws, even where audio isn't available", () => {
    expect(() => speakLetter({ id: "alif" })).not.toThrow();
  });

  it("plays only the recording, never the device's voice", async () => {
    vi.stubEnv("NEXT_PUBLIC_RECORDED_LETTERS", "ba");
    vi.resetModules();
    const fresh = await import("./letters");
    const played: string[] = [];
    const speak = vi.fn();
    let fail = false;
    vi.stubGlobal("window", globalThis);
    vi.stubGlobal("speechSynthesis", { speak, getVoices: () => [] });
    vi.stubGlobal(
      "Audio",
      class {
        constructor(public src: string) {}
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
    expect(played).toHaveLength(1);

    fail = true;
    const onFail = vi.fn();
    fresh.speakLetter({ id: "ba" }, onFail);
    await Promise.resolve();
    await Promise.resolve();
    expect(onFail).toHaveBeenCalledOnce();
    expect(speak).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });
});
