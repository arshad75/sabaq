export function uid(): string {
  // getRandomValues works in insecure contexts (e.g. a tablet hitting a LAN IP), randomUUID does not.
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
