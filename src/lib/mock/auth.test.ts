import { describe, expect, it } from "vitest";
import {
  consumeStudentLink,
  createStudentLink,
  MAX_PIN_ATTEMPTS,
  PIN_LOCK_MS,
  resetStudentPin,
  STUDENT_LINK_TTL_MS,
  tabletChildren,
  verifyPassword,
  verifyStudentPin,
} from "./auth";

describe("password login", () => {
  it("resolves the role from the account, not from the form", () => {
    expect(verifyPassword("amina@example.com", "lesson-sync-demo")?.role).toBe("teacher");
    expect(verifyPassword(" SARA@example.com ", "lesson-sync-demo")?.role).toBe("guardian");
  });

  it("rejects a wrong password and an unknown email the same way", () => {
    expect(verifyPassword("amina@example.com", "nope")).toBeNull();
    expect(verifyPassword("nobody@example.com", "lesson-sync-demo")).toBeNull();
  });
});

describe("student PIN", () => {
  it("accepts the right PIN and rejects malformed ones", () => {
    expect(verifyStudentPin("s3", "1234")).toEqual({ ok: true, studentId: "s3" });
    expect(verifyStudentPin("s3", "12a4")).toMatchObject({ ok: false, reason: "wrong" });
  });

  it("locks after repeated wrong PINs, even for the right PIN, until the lock expires", () => {
    const t0 = 1_000_000;
    for (let i = 1; i < MAX_PIN_ATTEMPTS; i++) {
      expect(verifyStudentPin("s4", "0000", t0)).toMatchObject({ reason: "wrong", attemptsLeft: MAX_PIN_ATTEMPTS - i });
    }
    expect(verifyStudentPin("s4", "0000", t0)).toMatchObject({ reason: "locked" });
    expect(verifyStudentPin("s4", "1234", t0 + 1000)).toMatchObject({ reason: "locked" });
    expect(verifyStudentPin("s4", "1234", t0 + PIN_LOCK_MS + 1)).toEqual({ ok: true, studentId: "s4" });
  });

  it("lets a guardian reset only their own child's PIN", () => {
    expect(resetStudentPin("g1", "s3")).toBeNull();
    const pin = resetStudentPin("g2", "s5")!;
    expect(pin).toMatch(/^\d{4}$/);
    expect(verifyStudentPin("s5", pin)).toEqual({ ok: true, studentId: "s5" });
  });
});

describe("one-time student links", () => {
  it("work once and only for the guardian's own child", () => {
    expect(createStudentLink("g1", "s3")).toBeNull();
    const token = createStudentLink("g1", "s2")!;
    expect(consumeStudentLink(token)).toBe("s2");
    expect(consumeStudentLink(token)).toBeNull();
  });

  it("expire", () => {
    const token = createStudentLink("g1", "s2", 0)!;
    expect(consumeStudentLink(token, STUDENT_LINK_TTL_MS + 1)).toBeNull();
  });
});

describe("tablet sign-in screen", () => {
  it("lists only the paired family's children", () => {
    expect(tabletChildren("g1").map((c) => c.nickname)).toEqual(["Maryam", "Yusuf", "Sumayya"]);
  });
});
