import { describe, expect, it } from "vitest";
import { toWordVerses, wordsText, type ApiWordVerse } from "./words";

// Placeholder strings stand in for the API's Quran text.
const verse = (over: Partial<ApiWordVerse> = {}): ApiWordVerse => ({
  verse_key: "112:1",
  verse_number: 1,
  text_indopak_nastaleeq: "[verse]",
  words: [
    { position: 1, char_type_name: "word", audio_url: "wbw/112_001_001.mp3", text_indopak_nastaleeq: "[a]" },
    { position: 2, char_type_name: "word", audio_url: "wbw/112_001_002.mp3", text_indopak_nastaleeq: "[b]" },
    { position: 3, char_type_name: "end", audio_url: null, text_indopak_nastaleeq: "[end]" },
  ],
  ...over,
});

describe("toWordVerses", () => {
  it("keeps words with their clips and drops the end marker", () => {
    const [v] = toWordVerses([verse()]);
    expect(v).toEqual({
      key: "112:1",
      number: 1,
      text: "[verse]",
      words: [
        { id: "112:1:1", position: 1, text: "[a]", audio: "https://verses.quran.foundation/wbw/112_001_001.mp3" },
        { id: "112:1:2", position: 2, text: "[b]", audio: "https://verses.quran.foundation/wbw/112_001_002.mp3" },
      ],
    });
    expect(wordsText(v)).toBe("[a] [b]");
  });

  it("refuses a verse with a missing word, clip or text rather than show it incomplete", () => {
    const words = verse().words!;
    expect(() => toWordVerses([verse({ text_indopak_nastaleeq: undefined })])).toThrow();
    expect(() => toWordVerses([verse({ words: [{ ...words[0], text_indopak_nastaleeq: undefined }] })])).toThrow();
    expect(() => toWordVerses([verse({ words: [{ ...words[0], audio_url: "https://elsewhere.example/x.mp3" }] })])).toThrow();
    expect(() => toWordVerses([verse({ words: [] })])).toThrow();
  });
});
