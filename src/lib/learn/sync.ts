"use client";

// Keeps the device's journey in step with the signed-in family account. Every failure is
// harmless: progress stays on the device and the next sync (on load, on reconnect) catches up.
import { useSyncExternalStore } from "react";
import { normalizeLearnerData } from "./progress";
import {
  addJourneyLearner,
  loadJourney,
  removeJourneyLearner,
  renameJourneyLearner,
  saveJourneyProgress,
} from "./journey-actions";
import { addLearner, adoptAccountLearners, forgetAccountLearners, learnerById, linkLearner, readStore } from "./store";

export const firstName = (name: string) => name.trim().split(/\s+/)[0]?.slice(0, 20) || "Learner";

type Signed = { accountName: string; canSync: boolean };
export type SyncState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "guest" }
  | { status: "offline" }
  | ({ status: "syncing" } & Signed)
  | ({ status: "synced" } & Signed);

let state: SyncState = { status: "idle" };
const listeners = new Set<() => void>();
const set = (s: SyncState) => {
  state = s;
  listeners.forEach((l) => l());
};

export function useSyncState(): SyncState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => state,
  );
}

let running: Promise<void> | null = null;

/** Pulls the account's learners, merges with this device, and uploads anything newer. */
export function syncJourney(): Promise<void> {
  running ??= run().finally(() => (running = null));
  return running;
}

async function run() {
  if (state.status === "idle") set({ status: "checking" });
  try {
    const j = await loadJourney();
    if (!j.signedIn) {
      forgetAccountLearners();
      set({ status: "guest" });
      return;
    }
    set({ status: "syncing", accountName: j.accountName, canSync: j.canSync });
    if (j.canSync) {
      // A new family starts straight on the path, named after the account; it can be renamed.
      if (j.learners.length === 0 && readStore().learners.length === 0) addLearner(firstName(j.accountName), "mint", 20);
      const { push, claim } = adoptAccountLearners(j.accountId, j.learners);
      for (const id of claim) {
        const l = learnerById(id);
        if (!l) continue;
        const studentId = await addJourneyLearner(l.learner.name, l.learner.color, l.data);
        if (studentId) linkLearner(id, studentId, j.accountId);
      }
      for (const id of push) await pushLearner(id);
    }
    set({ status: "synced", accountName: j.accountName, canSync: j.canSync });
  } catch {
    set({ status: "offline" });
  }
}

export async function pushLearner(id: string): Promise<void> {
  const l = learnerById(id);
  if (!l?.learner.studentId) return;
  try {
    await saveJourneyProgress(l.learner.studentId, l.learner.color, normalizeLearnerData(l.data));
  } catch {
    if (state.status === "synced") set({ status: "offline" });
  }
}

export async function pushActive(): Promise<void> {
  const id = readStore().active;
  if (id) await pushLearner(id);
}

/** A new learner made while signed in joins the account straight away. */
export async function claimNewLearners(): Promise<void> {
  if (state.status === "synced" && state.canSync) await syncJourney();
}

export async function renameRemote(id: string, name: string): Promise<void> {
  const l = learnerById(id);
  if (!l?.learner.studentId) return;
  try {
    await renameJourneyLearner(l.learner.studentId, name);
  } catch {
    // Kept locally; the account copy updates on the next rename.
  }
}

export async function removeRemote(studentId: string | undefined): Promise<void> {
  if (!studentId) return;
  try {
    await removeJourneyLearner(studentId);
  } catch {
    // If this fails offline the learner comes back on next sync, which is the safe direction.
  }
}

export function watchConnection(): () => void {
  const onUp = () => void syncJourney();
  window.addEventListener("online", onUp);
  return () => window.removeEventListener("online", onUp);
}
