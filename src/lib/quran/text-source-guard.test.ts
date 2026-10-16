import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

// Hard rule 1: Quran text only ever comes from the data layer. Two or more Arabic
// words in a row outside src/lib/quran is treated as hard-coded text and fails.
const SRC = join(__dirname, "..", "..");
const ALLOWED_DIR = join(SRC, "lib", "quran");
const ARABIC_RUN = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+(?:\s+[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+)+/;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return p === ALLOWED_DIR ? [] : walk(p);
    return /\.(tsx?|css|json|md)$/.test(name) ? [p] : [];
  });
}

describe("text source guard", () => {
  it("has no hard-coded Arabic passages outside src/lib/quran", () => {
    const offenders = walk(SRC)
      .filter((f) => ARABIC_RUN.test(readFileSync(f, "utf8")))
      .map((f) => relative(SRC, f));
    expect(offenders).toEqual([]);
  });
});
