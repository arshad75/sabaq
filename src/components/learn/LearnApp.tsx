"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { lessonById, type Lesson } from "@/lib/learn/curriculum";
import { buildLesson, buildReview, seeded, type Exercise } from "@/lib/learn/exercises";
import { badgesOf, dayKey, isUnlocked, learnedLetters, strengthOf, streak, type LearnerData, type LessonResult, type Outcome } from "@/lib/learn/progress";
import { activeLearner, recordResult, switchLearner, useLearnStore } from "@/lib/learn/store";
import { pushActive, syncJourney, watchConnection } from "@/lib/learn/sync";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/States";
import { LessonDone } from "./LessonDone";
import { LessonPlayer } from "./LessonPlayer";
import { AccountBar, LearnersView, ReviewIntro, StatsBar, Tabs, Welcome } from "./LearnParts";
import { PathView } from "./PathView";
import { ProfileView } from "./ProfileView";
import { Ring } from "./Ring";

// Hash routes keep the whole journey on one static page, so it works offline once loaded.
const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("hashchange", cb);
  window.addEventListener("popstate", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("hashchange", cb);
    window.removeEventListener("popstate", cb);
  };
}

export function navigate(path: string, replace = false) {
  const url = path ? `#/${path}` : `${location.pathname}${location.search}`;
  if (replace) history.replaceState(null, "", url);
  else history.pushState(null, "", url);
  listeners.forEach((l) => l());
  window.scrollTo({ top: 0 });
}

function useRoute(): string[] {
  const hash = useSyncExternalStore(subscribe, () => location.hash, () => "");
  return hash.replace(/^#\/?/, "").split("/").filter(Boolean);
}

function Session({
  lessonId,
  title,
  build,
  review = false,
}: {
  lessonId: string;
  title: string;
  build: () => Exercise[];
  review?: boolean;
}) {
  const [exercises] = useState(build);
  const [done, setDone] = useState<{ result: LessonResult; outcome: Outcome } | null>(null);
  const finish = useCallback((result: LessonResult) => {
    const outcome = recordResult(result);
    if (outcome) setDone({ result, outcome });
    void pushActive();
  }, []);
  if (done) return <LessonDone {...done} review={review} onContinue={() => navigate("", true)} />;
  return <LessonPlayer lessonId={lessonId} title={title} exercises={exercises} onQuit={() => navigate("", true)} onFinish={finish} />;
}

function SidePanel({ data }: { data: LearnerData }) {
  const today = dayKey();
  const todayXp = data.days[today] ?? 0;
  const next = badgesOf(data).filter((b) => !b.earned).slice(0, 3);
  return (
    <aside className="hidden space-y-4 lg:block">
      <div className="flex items-center gap-4 rounded-2xl border-2 border-border bg-surface p-4">
        <Ring value={todayXp} max={data.goal} size={72} label={`${todayXp} of ${data.goal} Noor today`}>
          <span className="text-sm font-bold">
            {Math.min(todayXp, data.goal)}/{data.goal}
          </span>
        </Ring>
        <div>
          <p className="font-bold">Daily goal</p>
          <p className="text-sm text-muted">{todayXp >= data.goal ? "Done for today. MashaAllah!" : `${data.goal - todayXp} Noor to go today`}</p>
        </div>
      </div>
      <div className="flex items-center gap-4 rounded-2xl border-2 border-border bg-surface p-4">
        <span className="grid size-[72px] place-items-center rounded-full bg-tile-sky text-mark-slip">
          <Icon name="moon" size={36} fill={todayXp > 0 ? "currentColor" : "none"} />
        </span>
        <div>
          <p className="font-bold">{streak(data.days, today)} days in a row</p>
          <p className="text-sm text-muted">{todayXp > 0 ? "You learned today!" : "Do a lesson to keep it going."}</p>
        </div>
      </div>
      {learnedLetters(data).length >= 2 && (
        <a
          href="#/review"
          onClick={(e) => {
            e.preventDefault();
            navigate("review");
          }}
          className="flex items-center gap-4 rounded-2xl bg-tile-lilac p-4 hover:brightness-95"
        >
          <span className="grid size-12 place-items-center rounded-xl bg-surface text-primary">
            <Icon name="dots" />
          </span>
          <span>
            <span className="block font-bold">Practise</span>
            <span className="block text-sm text-muted">Make your tricky letters strong</span>
          </span>
        </a>
      )}
      {next.length > 0 && (
        <div className="rounded-2xl border-2 border-border bg-surface p-4">
          <p className="mb-3 font-bold">Next badges</p>
          <ul className="space-y-3">
            {next.map((b) => (
              <li key={b.id} className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-full bg-surface-2 text-muted">
                  <Icon name={b.icon} size={18} />
                </span>
                <span>
                  <span className="block text-sm font-semibold">{b.title}</span>
                  <span className="block text-xs text-muted">{b.description}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}

export function LearnApp() {
  const store = useLearnStore();
  const route = useRoute();
  useEffect(() => {
    void syncJourney();
    return watchConnection();
  }, []);
  const [page, arg] = route;
  // Links from the family page open a specific child's journey, once sync has brought them in.
  const asTarget = page === "as" && arg ? store?.learners.find((l) => l.studentId === arg) : undefined;
  useEffect(() => {
    if (!asTarget) return;
    switchLearner(asTarget.id);
    navigate("", true);
  }, [asTarget]);

  if (!store) return <Skeleton className="h-96 w-full rounded-3xl" />;
  const active = activeLearner(store);
  if (!active) return <Welcome onDone={() => navigate("", true)} />;
  const { learner, data } = active;

  if (page === "learners") return <LearnersView store={store} onDone={() => navigate("", true)} />;

  if (page === "lesson" && arg) {
    const lesson = lessonById(arg);
    if (lesson && isUnlocked(data, lesson.id))
      return (
        <Session
          key={`${learner.id}:${lesson.id}`}
          lessonId={lesson.id}
          title={lesson.title}
          build={() => buildLesson(lesson as Lesson, seeded(Date.now()), (item) => strengthOf(data, item))}
        />
      );
  }

  if (page === "review" && arg === "go") {
    return (
      <Session
        key={`${learner.id}:review`}
        lessonId="review"
        title="Practice"
        review
        build={() => buildReview(learnedLetters(data), (item) => strengthOf(data, item), seeded(Date.now()))}
      />
    );
  }

  const tab = page === "review" ? "review" : page === "me" ? "me" : "path";
  return (
    <div className="space-y-5">
      <div className="sticky top-0 z-30 -mx-4 space-y-3 bg-bg/95 px-4 pt-2 pb-3 backdrop-blur">
        <StatsBar learner={learner} data={data} onLearners={() => navigate("learners")} />
        <Tabs at={tab} go={navigate} />
      </div>
      <AccountBar />
      {tab === "path" && (
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <PathView data={data} name={learner.name} onStart={(id) => navigate(`lesson/${id}`)} />
          <div className="lg:sticky lg:top-40 lg:self-start">
            <SidePanel data={data} />
          </div>
        </div>
      )}
      {tab === "review" && <ReviewIntro data={data} onStart={() => navigate("review/go")} onPath={() => navigate("")} />}
      {tab === "me" && <ProfileView learner={learner} data={data} onLearners={() => navigate("learners")} />}
    </div>
  );
}
