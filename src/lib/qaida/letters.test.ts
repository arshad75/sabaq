import { describe, expect, it } from "vitest";
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

  it("stays silent, without throwing, where there is no browser", () => {
    expect(speakLetter({ id: "alif", en: "Alif", ar: "x" })).toBe(false);
  });
});
