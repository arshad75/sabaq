import { describe, expect, it } from "vitest";
import { adoptAccount, forgetAccount, type LearnStore } from "./account-merge";
import { applyResult, emptyLearnerData, type LessonResult } from "./progress";

const result = (lessonId: string): LessonResult => ({ lessonId, correct: 10, total: 10, answers: [{ item: "ba", right: true }], ms: 1 });
let n = 0;
const newId = () => `new${++n}`;

describe("syncing a device with the family account", () => {
  const local: LearnStore = {
    version: 1,
    active: "dev",
    learners: [
      { id: "dev", name: "Device kid", color: "sun" },
      { id: "acc", name: "Sara", color: "sky", studentId: "s1", accountId: "A" },
      { id: "gone", name: "Removed elsewhere", color: "rose", studentId: "s9", accountId: "A" },
      { id: "other", name: "Other family", color: "mint", studentId: "s5", accountId: "B" },
    ],
    data: {
      dev: applyResult(emptyLearnerData(), result("u1-1"), "2026-10-17").data,
      acc: applyResult(emptyLearnerData(), result("u1-2"), "2026-10-17").data,
      gone: emptyLearnerData(),
      other: emptyLearnerData(),
    },
  };

  it("merges account learners, adds new ones, claims device-only ones and drops others", () => {
    const remote = [
      { studentId: "s1", name: "Sara K", color: "sky" as const, data: applyResult(emptyLearnerData(), result("u1-1"), "2026-10-16").data },
      { studentId: "s2", name: "Yusuf", color: "lilac" as const, data: {} },
    ];
    const { store, push, claim } = adoptAccount(local, "A", remote, newId);
    expect(store.learners.map((l) => l.name)).toEqual(["Sara K", "Yusuf", "Device kid"]);
    expect(Object.keys(store.data[store.learners[0].id].lessons).sort()).toEqual(["u1-1", "u1-2"]);
    expect(push).toEqual(["acc"]);
    expect(claim).toEqual(["dev"]);
    expect(store.learners[1]).toMatchObject({ studentId: "s2", accountId: "A" });
    expect(store.active).toBe("dev");
    expect(store.data.other).toBeUndefined();
  });

  it("doesn't push when nothing changed", () => {
    const { store } = adoptAccount(local, "A", [{ studentId: "s1", name: "Sara", color: "sky", data: local.data.acc }], newId);
    const again = adoptAccount(store, "A", [{ studentId: "s1", name: "Sara", color: "sky", data: store.data.acc }], newId);
    expect(again.push).toEqual([]);
  });

  it("forgets account learners after signing out, keeping device-only ones", () => {
    const s = forgetAccount(local);
    expect(s.learners.map((l) => l.id)).toEqual(["dev"]);
    expect(Object.keys(s.data)).toEqual(["dev"]);
    expect(forgetAccount(s)).toBe(s);
  });
});
