"use client";

// The learning journey's working copy lives on this device, so it works offline. One record per
// learner (siblings can share a tablet), with a nickname and a colour. When a family signs in,
// sync.ts keeps it in step with their account.
import { useSyncExternalStore } from "react";
import { adoptAccount, forgetAccount, type AccountLearner, type Learner, type LearnerColor, type LearnStore } from "./account-merge";
import { applyResult, dayKey, emptyLearnerData, normalizeLearnerData, type LearnerData, type LessonResult, type Outcome } from "./progress";

export type { Learner, LearnerColor, LearnStore };
export const LEARN_KEY = "sabaq:learn";

const EMPTY: LearnStore = { version: 1, active: null, learners: [], data: {} };
const listeners = new Set<() => void>();
let cached: LearnStore | null = null;

function read(): LearnStore {
  if (cached) return cached;
  try {
    const raw = localStorage.getItem(LEARN_KEY);
    const parsed = raw ? (JSON.parse(raw) as LearnStore) : null;
    cached = parsed?.version === 1 ? parsed : EMPTY;
  } catch {
    cached = EMPTY;
  }
  return cached;
}

function write(next: LearnStore) {
  cached = next;
  try {
    localStorage.setItem(LEARN_KEY, JSON.stringify(next));
  } catch {
    // Private mode or full storage: keep it for this visit.
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== LEARN_KEY) return;
    cached = null;
    cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

/** The store, or null during server render and hydration. */
export function useLearnStore(): LearnStore | null {
  return useSyncExternalStore(subscribe, read, () => null);
}

export function readStore(): LearnStore {
  return read();
}

export function learnerById(id: string): { learner: Learner; data: LearnerData } | null {
  const s = read();
  const learner = s.learners.find((l) => l.id === id);
  return learner ? { learner, data: normalizeLearnerData(s.data[learner.id]) } : null;
}

export function activeLearner(s: LearnStore): { learner: Learner; data: LearnerData } | null {
  const learner = s.learners.find((l) => l.id === s.active);
  return learner ? { learner, data: s.data[learner.id] ?? emptyLearnerData() } : null;
}

const newId = () => Math.random().toString(36).slice(2, 10);

export function addLearner(name: string, color: LearnerColor, goal: number): Learner {
  const s = read();
  const learner: Learner = { id: newId(), name: name.trim().slice(0, 20) || "Learner", color };
  write({
    ...s,
    active: learner.id,
    learners: [...s.learners, learner],
    data: { ...s.data, [learner.id]: { ...emptyLearnerData(), goal } },
  });
  return learner;
}

export function switchLearner(id: string) {
  write({ ...read(), active: id });
}

export function updateLearner(id: string, patch: Partial<Pick<Learner, "name" | "color">>) {
  const s = read();
  write({ ...s, learners: s.learners.map((l) => (l.id === id ? { ...l, ...patch, name: (patch.name ?? l.name).trim().slice(0, 20) || l.name } : l)) });
}

export function removeLearner(id: string) {
  const s = read();
  const learners = s.learners.filter((l) => l.id !== id);
  const data = { ...s.data };
  delete data[id];
  write({ ...s, learners, data, active: s.active === id ? (learners[0]?.id ?? null) : s.active });
}

export function setGoal(goal: number) {
  const s = read();
  const a = activeLearner(s);
  if (!a) return;
  write({ ...s, data: { ...s.data, [a.learner.id]: { ...a.data, goal } } });
}

export function resetProgress(id: string) {
  const s = read();
  write({ ...s, data: { ...s.data, [id]: { ...emptyLearnerData(), goal: s.data[id]?.goal ?? 20 } } });
}

export function recordResult(result: LessonResult): Outcome | null {
  const s = read();
  const a = activeLearner(s);
  if (!a) return null;
  const outcome = applyResult(a.data, result, dayKey());
  write({ ...s, data: { ...s.data, [a.learner.id]: outcome.data } });
  return outcome;
}

/** Takes in the signed-in account's learners; returns which learners to upload. */
export function adoptAccountLearners(accountId: string, remote: AccountLearner[]) {
  const { store, push, claim } = adoptAccount(read(), accountId, remote, newId);
  write(store);
  return { push, claim };
}

export function linkLearner(id: string, studentId: string, accountId: string) {
  const s = read();
  write({ ...s, learners: s.learners.map((l) => (l.id === id ? { ...l, studentId, accountId } : l)) });
}

export function forgetAccountLearners() {
  const s = read();
  const next = forgetAccount(s);
  if (next !== s) write(next);
}
