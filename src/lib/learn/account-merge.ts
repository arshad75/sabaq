// Brings a device's learners in line with the signed-in account. Pure, so it can be tested.
import { mergeLearnerData, normalizeLearnerData, type LearnerData } from "./progress";

export type LearnerColor = "mint" | "sky" | "peach" | "lilac" | "sun" | "rose";
/** studentId/accountId are set once the learner is saved to a family account. */
export type Learner = { id: string; name: string; color: LearnerColor; studentId?: string; accountId?: string };

export type LearnStore = {
  version: 1;
  active: string | null;
  learners: Learner[];
  data: Record<string, LearnerData>;
};

export type AccountLearner = { studentId: string; name: string; color: LearnerColor; data: unknown };

export type Adopted = {
  store: LearnStore;
  /** Learners whose merged progress differs from the account's copy. */
  push: string[];
  /** Device-only learners to add to the account. */
  claim: string[];
};

export function adoptAccount(
  s: LearnStore,
  accountId: string,
  remote: AccountLearner[],
  newId: () => string,
): Adopted {
  const push: string[] = [];
  const data: Record<string, LearnerData> = {};
  const remoteIds = new Set(remote.map((r) => r.studentId));
  // Another account's learners leave this device; they're safe in that account.
  const kept = s.learners.filter((l) => !l.accountId || (l.accountId === accountId && l.studentId && remoteIds.has(l.studentId)));
  const learners: Learner[] = [];

  for (const r of remote) {
    const theirs = normalizeLearnerData(r.data);
    const local = kept.find((l) => l.studentId === r.studentId);
    if (local) {
      const merged = mergeLearnerData(normalizeLearnerData(s.data[local.id]), theirs);
      learners.push({ ...local, name: r.name, accountId });
      data[local.id] = merged;
      if (JSON.stringify(merged) !== JSON.stringify(theirs)) push.push(local.id);
    } else {
      const id = newId();
      learners.push({ id, name: r.name, color: r.color, studentId: r.studentId, accountId });
      data[id] = theirs;
    }
  }

  const claim: string[] = [];
  for (const l of kept) {
    if (l.accountId) continue;
    learners.push(l);
    data[l.id] = normalizeLearnerData(s.data[l.id]);
    claim.push(l.id);
  }

  const active = learners.some((l) => l.id === s.active) ? s.active : (learners[0]?.id ?? null);
  return { store: { version: 1, active, learners, data }, push, claim };
}

/** After signing out, only device-only learners stay on a shared device. */
export function forgetAccount(s: LearnStore): LearnStore {
  const learners = s.learners.filter((l) => !l.accountId);
  if (learners.length === s.learners.length) return s;
  const data = Object.fromEntries(learners.map((l) => [l.id, s.data[l.id]]).filter(([, d]) => d));
  const active = learners.some((l) => l.id === s.active) ? s.active : (learners[0]?.id ?? null);
  return { version: 1, active, learners, data };
}
