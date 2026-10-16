export type PreviewState = "ready" | "loading" | "empty" | "error";

const STATES: PreviewState[] = ["ready", "loading", "empty", "error"];

export const previewEnabled =
  process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_SCREEN_PREVIEW === "1";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Dev-only: `?state=loading|empty|error` forces a screen into that state for review. */
export async function getPreviewState(searchParams: SearchParams): Promise<PreviewState> {
  if (!previewEnabled) return "ready";
  const raw = (await searchParams).state;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return STATES.includes(value as PreviewState) ? (value as PreviewState) : "ready";
}
