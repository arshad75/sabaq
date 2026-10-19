import { describe, expect, it } from "vitest";
import { blocksText, tafsirBlocks } from "./tafsir-html";

// Shapes seen in real Quran Foundation responses; the words are placeholders, never religious text.
describe("tafsir HTML to plain blocks", () => {
  it("keeps headings, paragraphs and every word, and drops all tags", () => {
    const html =
      '<h2>[[PLACEHOLDER heading]]</h2><p>[[PLACEHOLDER one]] &amp; [[two]]<br>[[three]]</p><p class="x"><script>[[PLACEHOLDER]]</script></p>';
    const blocks = tafsirBlocks(html);
    expect(blocks.map((b) => b.kind)).toEqual(["h", "p", "p"]);
    expect(blocks[1].runs).toEqual([{ text: "[[PLACEHOLDER one]] & [[two]]\n[[three]]" }]);
    // A script tag's contents come through as inert text, never as markup.
    expect(JSON.stringify(blocks)).not.toContain("<");
    expect(blocksText(blocks)).toBe("[[PLACEHOLDER heading]][[PLACEHOLDER one]] & [[two]]\n[[three]][[PLACEHOLDER]]");
  });

  it("marks Arabic quotations and right-to-left blocks", () => {
    const html =
      '<p>[[en]] <span class="arabic qpc-hafs">[[PLACEHOLDER ar]]</span> [[en again]]</p><div lang="ur" class="ur"><p class="ur">[[PLACEHOLDER ur]]</p></div>';
    const [en, ur] = tafsirBlocks(html);
    expect(en.runs).toEqual([{ text: "[[en]] " }, { text: "[[PLACEHOLDER ar]]", arabic: true }, { text: " [[en again]]" }]);
    expect(ur.lang).toBe("ur");
  });

  it("treats plain text without tags as one paragraph", () => {
    expect(tafsirBlocks("[[PLACEHOLDER plain]]")).toEqual([{ kind: "p", runs: [{ text: "[[PLACEHOLDER plain]]" }] }]);
    expect(tafsirBlocks("<p> </p>")).toEqual([]);
  });

  it("decodes numeric entities and leaves unknown ones as written", () => {
    expect(blocksText(tafsirBlocks("<p>&#65;&#x42; &unknown;</p>"))).toBe("AB &unknown;");
  });

  it("never drops or changes a character, including tatweel and combining marks", () => {
    // Code points only (tatweel, fatha, shadda, superscript alif); no words.
    const marks = "\u0640\u064e\u0651\u0670";
    expect(blocksText(tafsirBlocks(`<p><span class="arabic">[[${marks}]]</span></p>`))).toBe(`[[${marks}]]`);
  });
});
