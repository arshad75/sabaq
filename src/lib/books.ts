import type { Book } from "@/lib/domain/types";
import { getSource } from "@/lib/quran";

export const QAIDA = {
  pageCount: 39,
  width: 900,
  height: 1305,
  attribution: {
    title: "Noorani Qaida – Indian Edition",
    author: "Qamar Apps",
    url: "https://www.qamarapps.com",
    licence: "CC BY-SA 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    changes: "Resized and converted to WebP",
  },
} as const;

export function qaidaImageSrc(page: number): string {
  return `/qaida/${String(page).padStart(2, "0")}.webp`;
}

export const BOOK_LABEL: Record<Book, string> = { quran: "Quran", qaida: "Qaida" };

export function bookPageCount(book: Book): number {
  return book === "qaida" ? QAIDA.pageCount : getSource().pageCount;
}

export function clampBookPage(book: Book, page: number): number {
  return Math.min(Math.max(1, Math.round(page)), bookPageCount(book));
}

export function parseBook(value: unknown): Book | null {
  return value === "quran" || value === "qaida" ? value : null;
}
