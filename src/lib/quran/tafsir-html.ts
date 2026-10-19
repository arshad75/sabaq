// Turns a tafsir's HTML (from the Quran Foundation API) into plain blocks the page renders as text,
// so no outside markup ever reaches the DOM. Text is kept exactly; only tags are dropped.

export type Run = { text: string; arabic?: boolean };
export type Block = { kind: "p" | "h"; lang?: string; runs: Run[] };

const BLOCK_TAGS = new Set(["p", "div", "h1", "h2", "h3", "h4", "h5", "h6", "li", "blockquote"]);
const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: "\u00a0" };

function decode(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

const attr = (attrs: string, name: string) => attrs.match(new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`, "i"))?.[1];

/** Paragraphs and headings with their text; Arabic quotations are marked so they can be shown right to left. */
export function tafsirBlocks(html: string): Block[] {
  const blocks: Block[] = [];
  let current: Block | null = null;
  const blockLang: (string | undefined)[] = [];
  const inline: boolean[] = [];
  const open = (kind: Block["kind"], lang?: string) => {
    current = { kind, lang, runs: [] };
    blocks.push(current);
  };
  const push = (text: string) => {
    if (!text) return;
    if (!current) open("p", blockLang.at(-1));
    const arabic = inline.includes(true);
    const last = current!.runs.at(-1);
    if (last && !!last.arabic === arabic) last.text += text;
    else current!.runs.push(arabic ? { text, arabic } : { text });
  };

  for (const m of html.matchAll(/<(\/?)([a-z][a-z0-9]*)([^>]*)>|([^<]+)/gi)) {
    if (m[4] !== undefined) {
      push(decode(m[4]));
      continue;
    }
    const closing = m[1] === "/";
    const tag = m[2].toLowerCase();
    const attrs = m[3] ?? "";
    if (tag === "br") {
      push("\n");
    } else if (BLOCK_TAGS.has(tag)) {
      if (closing) {
        blockLang.pop();
        current = null;
      } else {
        const lang = attr(attrs, "lang") ?? (/\bclass="[^"]*\b(ar|ur)\b/i.exec(attrs)?.[1] || blockLang.at(-1));
        blockLang.push(lang);
        open(/^h\d$/.test(tag) ? "h" : "p", lang);
      }
    } else if (!/\/\s*$/.test(attrs)) {
      if (closing) inline.pop();
      else inline.push(/\bclass="[^"]*\barabic\b/i.test(attrs) || attr(attrs, "lang") === "ar");
    }
  }
  return blocks.filter((b) => b.runs.some((r) => r.text.trim()));
}

/** All the text, in order, as a check that converting kept every word. */
export function blocksText(blocks: Block[]): string {
  return blocks.map((b) => b.runs.map((r) => r.text).join("")).join("");
}

/** A translation's text without markup. Footnote markers (`<sup foot_note>`) are left out until footnotes are shown. */
export function translationText(html: string): string {
  return decode(html.replace(/<sup\b[^>]*>[\s\S]*?<\/sup>/gi, "").replace(/<[^>]+>/g, ""));
}
