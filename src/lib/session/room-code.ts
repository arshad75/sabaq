// No I, O, 0, 1: easy to read aloud over a call and type on a tablet.
export const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const ROOM_CODE_LENGTH = 6;

const CODE_RE = new RegExp(`^[${ROOM_CODE_ALPHABET}]{${ROOM_CODE_LENGTH}}$`);

export function normaliseRoomCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function isValidRoomCode(code: string): boolean {
  return CODE_RE.test(code);
}

export function generateRoomCode(randomValues: (arr: Uint32Array) => Uint32Array = (a) => crypto.getRandomValues(a)): string {
  const bytes = randomValues(new Uint32Array(ROOM_CODE_LENGTH));
  let code = "";
  // Alphabet length is a power of two, so the modulo is unbiased.
  for (const b of bytes) code += ROOM_CODE_ALPHABET[b % ROOM_CODE_ALPHABET.length];
  return code;
}
