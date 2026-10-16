import { getSessionUser } from "./session";
import { previewEnabled } from "@/lib/preview";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * Which child the student screens are for: the signed-in child, or (dev only) `?as=<id>`
 * for browsing prototype screens. `qs` keeps the preview param on internal links.
 */
export async function getViewingStudent(searchParams: SearchParams): Promise<{ id: string; qs: string } | null> {
  const user = await getSessionUser();
  if (user?.role === "student") return { id: user.id, qs: "" };
  const raw = previewEnabled ? (await searchParams).as : undefined;
  if (typeof raw === "string" && /^s\d+$/.test(raw)) return { id: raw, qs: `?as=${raw}` };
  return null;
}
