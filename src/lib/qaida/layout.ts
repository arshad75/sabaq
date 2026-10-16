import layout from "./layout.json";
import type { PagePoint } from "@/lib/session/events";

/** A tappable word/letter box on a Qaida page image, in fractions of the page size. */
export type QaidaCell = {
  id: string;
  /** 1-based, top to bottom. */
  line: number;
  /** 1-based, right to left (reading order). */
  word: number;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
};

type Row = { y0: number; y1: number; boxes: [number, number][] };
const pages = (layout as unknown as { pages: Record<string, Row[]> }).pages;
const cache = new Map<number, QaidaCell[]>();

/** Boxes detected by scripts/qaida-layout.py; empty if a page has none. */
export function qaidaCells(page: number): QaidaCell[] {
  let cells = cache.get(page);
  if (!cells) {
    cells = (pages[String(page)] ?? []).flatMap((row, r) =>
      row.boxes.map(([x0, x1], b) => ({
        id: `${r + 1}:${b + 1}`,
        line: r + 1,
        word: b + 1,
        x0,
        x1,
        y0: row.y0,
        y1: row.y1,
      })),
    );
    cache.set(page, cells);
  }
  return cells;
}

export function cellCenter(c: QaidaCell): PagePoint {
  return { x: (c.x0 + c.x1) / 2, y: (c.y0 + c.y1) / 2 };
}

/** The box a point falls in (saved marks and positions are stored as points). */
export function cellAt(page: number, p: PagePoint): QaidaCell | undefined {
  return qaidaCells(page).find((c) => p.x >= c.x0 && p.x <= c.x1 && p.y >= c.y0 && p.y <= c.y1);
}

/** Like cellAt, but falls back to the closest box, for points recorded before boxes existed. */
export function nearestCell(page: number, p: PagePoint): QaidaCell | undefined {
  const cells = qaidaCells(page);
  const hit = cellAt(page, p);
  if (hit || cells.length === 0) return hit;
  const d = (c: QaidaCell) => {
    const m = cellCenter(c);
    return (m.x - p.x) ** 2 + (m.y - p.y) ** 2;
  };
  return cells.reduce((best, c) => (d(c) < d(best) ? c : best));
}
