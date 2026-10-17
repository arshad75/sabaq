"use server";

import { supabaseAuth } from "@/lib/auth/mode";
import { createSupabaseServer } from "@/lib/supabase/server";

const COLORS = ["mint", "sky", "peach", "lilac", "sun", "rose"] as const;
type Color = (typeof COLORS)[number];
const MAX_LEARNERS = 12;
const MAX_BYTES = 60_000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type RemoteLearner = { studentId: string; name: string; color: Color; data: unknown };
export type Journey =
  | { signedIn: false }
  | { signedIn: true; accountId: string; accountName: string; canSync: boolean; learners: RemoteLearner[] };

const color = (c: unknown): Color => (COLORS.includes(c as Color) ? (c as Color) : "mint");
const cleanName = (n: unknown) => String(n ?? "").trim().slice(0, 20);

async function me() {
  if (!supabaseAuth) return null;
  const supabase = await createSupabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: p } = await supabase
    .from("profiles")
    .select("role, display_name")
    .eq("id", data.user.id)
    .maybeSingle<{ role: "guardian" | "teacher"; display_name: string }>();
  return p ? { supabase, id: data.user.id, role: p.role, name: p.display_name } : null;
}

/** The signed-in family's learners and their saved progress. */
export async function loadJourney(): Promise<Journey> {
  const who = await me();
  if (!who) return { signedIn: false };
  const canSync = who.role === "guardian";
  if (!canSync) return { signedIn: true, accountId: who.id, accountName: who.name, canSync, learners: [] };
  const { data, error } = await who.supabase
    .from("students")
    .select("id, nickname, created_at, learn_progress(color, data)")
    .eq("guardian_id", who.id)
    .order("created_at");
  if (error) throw new Error("Could not load the journey");
  type Row = { id: string; nickname: string; learn_progress: { color: string; data: unknown } | { color: string; data: unknown }[] | null };
  const learners = (data as Row[]).map((r) => {
    const p = Array.isArray(r.learn_progress) ? r.learn_progress[0] : r.learn_progress;
    return { studentId: r.id, name: r.nickname, color: color(p?.color), data: p?.data ?? {} };
  });
  return { signedIn: true, accountId: who.id, accountName: who.name, canSync, learners };
}

/** Adds a learner to the family account and returns its id. */
export async function addJourneyLearner(name: string, learnerColor: string, data: unknown): Promise<string | null> {
  const who = await me();
  if (!who || who.role !== "guardian") return null;
  const nickname = cleanName(name) || "Learner";
  const { count } = await who.supabase.from("students").select("id", { count: "exact", head: true }).eq("guardian_id", who.id);
  if ((count ?? 0) >= MAX_LEARNERS) return null;
  const { data: row, error } = await who.supabase
    .from("students")
    .insert({ guardian_id: who.id, nickname })
    .select("id")
    .single<{ id: string }>();
  if (error || !row) return null;
  await saveJourneyProgress(row.id, learnerColor, data);
  return row.id;
}

/** Saves a learner's progress; Row Level Security limits this to the learner's own family. */
export async function saveJourneyProgress(studentId: string, learnerColor: string, data: unknown): Promise<boolean> {
  const who = await me();
  if (!who || !UUID_RE.test(studentId)) return false;
  if (!data || typeof data !== "object" || Array.isArray(data) || JSON.stringify(data).length > MAX_BYTES) return false;
  // Update, else insert: an upsert would need UPDATE rights on student_id, which clients never get.
  const row = { color: color(learnerColor), data };
  const { data: updated, error } = await who.supabase
    .from("learn_progress")
    .update(row)
    .eq("student_id", studentId)
    .select("student_id");
  if (error) return false;
  if (updated.length > 0) return true;
  const { error: insertError } = await who.supabase.from("learn_progress").insert({ student_id: studentId, ...row });
  return !insertError;
}

export async function renameJourneyLearner(studentId: string, name: string): Promise<boolean> {
  const who = await me();
  const nickname = cleanName(name);
  if (!who || !UUID_RE.test(studentId) || !nickname) return false;
  const { error } = await who.supabase.from("students").update({ nickname }).eq("id", studentId);
  return !error;
}

/** Removes a learner and everything about them from the family account. */
export async function removeJourneyLearner(studentId: string): Promise<boolean> {
  const who = await me();
  if (!who || !UUID_RE.test(studentId)) return false;
  const { error } = await who.supabase.from("students").delete().eq("id", studentId).eq("guardian_id", who.id);
  return !error;
}
