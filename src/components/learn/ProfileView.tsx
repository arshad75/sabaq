"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { ALL_LETTERS, LESSONS, letter } from "@/lib/learn/curriculum";
import { GOALS, badgesOf, dayKey, lastWeek, masteredCount, strengthOf, streak, type LearnerData } from "@/lib/learn/progress";
import { removeLearner, resetProgress, setGoal, updateLearner, type Learner } from "@/lib/learn/store";
import { pushActive, pushLearner, removeRemote, renameRemote } from "@/lib/learn/sync";
import { setPrefs, usePrefs } from "@/lib/prefs";
import { speakLetter } from "@/lib/qaida/letters";
import { BadgeGrid } from "@/components/ui/Friendly";
import { Card, CardHeader } from "@/components/ui/Card";
import { SegmentedControl, Switch } from "@/components/ui/Form";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Avatar, Strength } from "./LearnParts";

const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function BigStat({ icon, value, label, tone }: { icon: IconName; value: string | number; label: string; tone: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border-2 border-border bg-surface p-3">
      <Icon name={icon} size={28} className={tone} fill={icon === "moon" || icon === "spark" ? "currentColor" : "none"} />
      <span>
        <span className="block text-2xl leading-tight font-bold">{value}</span>
        <span className="block text-sm text-muted">{label}</span>
      </span>
    </div>
  );
}

function Confirm({ label, confirm, onConfirm }: { label: string; confirm: string; onConfirm: () => void }) {
  const [asking, setAsking] = useState(false);
  return asking ? (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium">{confirm}</span>
      <button type="button" onClick={onConfirm} className="min-h-11 rounded-xl bg-danger px-4 font-semibold text-primary-fg">
        Yes
      </button>
      <button type="button" onClick={() => setAsking(false)} className="min-h-11 rounded-xl px-4 font-semibold hover:bg-surface-2">
        Cancel
      </button>
    </span>
  ) : (
    <button type="button" onClick={() => setAsking(true)} className="min-h-11 rounded-xl border border-danger/40 bg-danger-soft px-4 font-semibold text-danger">
      {label}
    </button>
  );
}

export function ProfileView({ learner, data, onLearners }: { learner: Learner; data: LearnerData; onLearners: () => void }) {
  const today = dayKey();
  const week = lastWeek(data, today);
  const top = Math.max(data.goal, ...week.map((d) => d.xp));
  const prefs = usePrefs();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(learner.name);
  const done = Object.keys(data.lessons).length;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center gap-4">
        <Avatar learner={learner} size="lg" />
        <div className="min-w-0 flex-1">
          {editing ? (
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                updateLearner(learner.id, { name });
                void renameRemote(learner.id, name);
                setEditing(false);
              }}
            >
              <label htmlFor="rename" className="sr-only">
                Nickname
              </label>
              <input
                id="rename"
                value={name}
                maxLength={20}
                autoFocus
                onChange={(e) => setName(e.target.value)}
                className="min-h-11 min-w-0 flex-1 rounded-xl border-2 border-border bg-surface px-3 text-lg"
              />
              <button type="submit" className="min-h-11 rounded-xl bg-primary px-4 font-semibold text-primary-fg">
                Save
              </button>
            </form>
          ) : (
            <h1 className="flex items-center gap-2 text-3xl font-bold">
              {learner.name}
              <button type="button" aria-label="Change nickname" onClick={() => setEditing(true)} className="grid size-11 place-items-center rounded-xl text-muted hover:bg-surface-2">
                <Icon name="edit" />
              </button>
            </h1>
          )}
          <p className="flex items-center gap-1.5 text-sm text-muted">
            <Icon name="shield" size={14} /> {learner.studentId ? "Saved to your family account" : "Saved on this device only"}
          </p>
        </div>
        <button type="button" onClick={onLearners} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-surface px-4 font-semibold hover:bg-surface-2">
          <Icon name="users" size={18} /> Switch learner
        </button>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <BigStat icon="moon" value={streak(data.days, today)} label="Days in a row" tone="text-mark-slip" />
        <BigStat icon="spark" value={data.xp} label="Total Noor" tone="text-star" />
        <BigStat icon="check" value={`${done}/${LESSONS.length}`} label="Lessons done" tone="text-success" />
        <BigStat icon="star" value={`${masteredCount(data)}/29`} label="Strong letters" tone="text-primary" />
      </div>

      <Card>
        <CardHeader title="This week" description={`Daily goal: ${data.goal} Noor`} />
        <div className="relative flex h-40 items-end gap-2 sm:gap-4" role="img" aria-label={`Noor this week: ${week.map((d) => d.xp).join(", ")}`}>
          <span aria-hidden className="absolute inset-x-0 border-t-2 border-dashed border-star/60" style={{ bottom: `${(data.goal / top) * 100}%` }} />
          {week.map((d) => (
            <div key={d.day} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
              <span className="text-xs font-semibold text-muted">{d.xp || ""}</span>
              <span
                className={cn("w-full max-w-12 rounded-t-lg", d.xp >= data.goal ? "bg-star" : d.xp > 0 ? "bg-primary" : "bg-surface-2")}
                style={{ height: `${Math.max(4, (d.xp / top) * 100)}%` }}
              />
              <span className={cn("text-xs", d.day === today ? "font-bold" : "text-muted")}>{DAY[new Date(`${d.day}T12:00:00`).getDay()]}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title="My letters" description="Tap a letter to hear it. The bar fills as a letter gets stronger." />
        <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-10" data-no-say>
          {ALL_LETTERS.map((id) => {
            const l = letter(id);
            const s = strengthOf(data, id);
            const seen = !!data.items[id];
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => speakLetter(l)}
                  aria-label={`${l.en}, strength ${s} of 5`}
                  className={cn("flex w-full flex-col items-center rounded-2xl border-2 p-2 hover:bg-surface-2", seen ? "border-border bg-surface" : "border-dashed border-border bg-surface-2/50 opacity-70")}
                >
                  <span lang="ar" dir="rtl" className="font-arabic text-4xl leading-[1.4]">
                    {l.glyph}
                  </span>
                  <span className="text-xs font-semibold">{l.en}</span>
                  <Strength value={s} />
                </button>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card>
        <CardHeader title="Badges" />
        <BadgeGrid badges={badgesOf(data)} />
      </Card>

      <Card>
        <CardHeader title="Settings" />
        <div className="space-y-4">
          <SegmentedControl
            name="goal"
            label="Daily goal"
            value={String(data.goal)}
            options={GOALS.map((g) => ({ value: String(g.xp), label: `${g.label} · ${g.xp}` }))}
            onChange={(v) => {
              setGoal(Number(v));
              void pushActive();
            }}
          />
          <Switch id="fx" label="Sound effects" description="Chimes for right answers and a soft tone for mistakes." checked={prefs.effects} onChange={(v) => setPrefs({ effects: v })} />
          <div className="flex flex-wrap gap-3 border-t border-border pt-4">
            <Confirm
              label="Reset progress"
              confirm={`Start ${learner.name} from the beginning?`}
              onConfirm={() => {
                resetProgress(learner.id);
                void pushLearner(learner.id);
              }}
            />
            <Confirm
              label="Remove learner"
              confirm={
                learner.studentId
                  ? `Remove ${learner.name} and all their progress from your account?`
                  : `Remove ${learner.name} from this device?`
              }
              onConfirm={() => {
                void removeRemote(learner.studentId);
                removeLearner(learner.id);
              }}
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
