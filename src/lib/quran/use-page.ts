"use client";

import { use } from "react";
import { getPage } from "./index";
import type { QuranPage } from "./types";

const pageCache = new Map<number, Promise<QuranPage>>();

export function loadPage(page: number): Promise<QuranPage> {
  let promise = pageCache.get(page);
  if (!promise) {
    promise = getPage(page);
    pageCache.set(page, promise);
  }
  return promise;
}

export function clearPageCache() {
  pageCache.clear();
}

/** Suspends until the page is loaded; wrap callers in <Suspense>. */
export function usePage(page: number): QuranPage {
  return use(loadPage(page));
}
