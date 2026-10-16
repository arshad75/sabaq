import { describe, expect, it } from "vitest";
import { decodeToken, encodeToken } from "./session";

describe("signed session tokens", () => {
  it("round-trips a payload", () => {
    expect(decodeToken(encodeToken({ role: "teacher", id: "t1" }, 60))).toMatchObject({ role: "teacher", id: "t1" });
  });

  it("rejects a tampered payload", () => {
    const [, mac] = encodeToken({ role: "student", id: "s1" }, 60).split(".");
    const forged = Buffer.from(JSON.stringify({ role: "teacher", id: "t1", exp: 9e9 })).toString("base64url");
    expect(decodeToken(`${forged}.${mac}`)).toBeNull();
  });

  it("rejects expired and malformed tokens", () => {
    const now = Date.now();
    expect(decodeToken(encodeToken({ id: "t1" }, 60, now), now + 61_000)).toBeNull();
    expect(decodeToken("garbage")).toBeNull();
    expect(decodeToken(undefined)).toBeNull();
  });
});
