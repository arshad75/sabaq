import { describe, expect, it } from "vitest";
import {
  getChild,
  getSessionForTeacher,
  getStudentForTeacher,
  getTeacherNotes,
  linkedTeachersForChild,
  listStudentsForTeacher,
} from "./repo";

// These mirror the RLS rules the Supabase tests must prove in M3.
describe("mock access scoping", () => {
  it("only lists a teacher's approved students", () => {
    expect(listStudentsForTeacher("t1").map((s) => s.id).sort()).toEqual(["s1", "s2", "s3", "s6"]);
    expect(listStudentsForTeacher("t2").map((s) => s.id)).toEqual(["s4"]);
  });

  it("hides another teacher's students", () => {
    expect(getStudentForTeacher("t1", "s4")).toBeUndefined();
    expect(getStudentForTeacher("t2", "s1")).toBeUndefined();
    expect(getTeacherNotes("t2", "s1")).toEqual([]);
  });

  it("hides students who are only invited, not approved", () => {
    expect(getStudentForTeacher("t1", "s5")).toBeUndefined();
  });

  it("hides another teacher's sessions", () => {
    expect(getSessionForTeacher("t2", "s1-sess-1")).toBeUndefined();
    expect(getSessionForTeacher("t1", "s1-sess-1")).toBeDefined();
  });

  it("limits guardians to their own children", () => {
    expect(getChild("g1", "s3")).toBeUndefined();
    expect(linkedTeachersForChild("g1", "s3")).toEqual([]);
    expect(getChild("g1", "s1")?.nickname).toBe("Maryam");
  });
});
