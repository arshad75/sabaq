/** Only same-site paths, so sign-in can't be used to send people elsewhere. */
export function safeNext(next: unknown): string | null {
  const n = typeof next === "string" ? next : "";
  return n.startsWith("/") && !n.startsWith("//") && !n.startsWith("/\\") ? n : null;
}
