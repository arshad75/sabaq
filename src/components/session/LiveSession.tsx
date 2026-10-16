"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition, type ReactNode } from "react";
import { MARK_CONFIG } from "@/lib/marks";
import { MARK_TYPES, type Book, type MarkType } from "@/lib/domain/types";
import type { QuranWord } from "@/lib/quran/types";
import { wordKey } from "@/lib/quran/types";
import {
  marksByWord,
  type LiveMark,
  type PagePoint,
  type SessionRole,
  type SharedState,
  type StudentPosition,
} from "@/lib/session/events";
import { saveLiveLesson } from "@/lib/session/actions";
import { supabaseAuth } from "@/lib/auth/mode";
import { useLiveSession, type PeerStatus } from "@/lib/session/use-live-session";
import { usePrefs, type ReadingTheme } from "@/lib/prefs";
import { BOOK_LABEL } from "@/lib/books";
import { cellAt } from "@/lib/qaida/layout";
import { cn } from "@/lib/cn";
import { Banner } from "@/components/ui/States";
import { Button, ButtonLink, IconButton } from "@/components/ui/Button";
import { ConnectionDot, MarkChip, type ConnectionState } from "@/components/ui/Indicators";
import { Icon } from "@/components/ui/Icon";
import { TextArea } from "@/components/ui/Form";
import { ImagePageView } from "@/components/reading/ImagePageView";
import { FullScreenMessage, JumpTo, PageNavBar, PageSurface, PageTurner, wordRef } from "./parts";

export type ForcedSessionState = "waiting" | "reconnecting" | "ended" | null;

type Props = {
  code: string;
  role: SessionRole;
  book?: Book | null;
  /** Set when the teacher started the room from their dashboard; needed to save the lesson. */
  studentId?: string | null;
  startPage?: number;
  latencyMs?: number;
  forced?: ForcedSessionState;
};

/** What the teacher is about to mark: a word (Quran) or a spot on a page image (Qaida). */
type Target = { page: number; word?: QuranWord; point?: PagePoint; markId?: string };

function peerToConnection(s: PeerStatus): ConnectionState {
  return s === "left" ? "waiting" : s;
}

/** Rough place on an image page, so a list entry can be matched to its pin by eye. */
function pointArea({ x, y }: PagePoint): string {
  const row = y < 1 / 3 ? "top" : y < 2 / 3 ? "middle" : "bottom";
  const col = x < 1 / 3 ? "left" : x < 2 / 3 ? "centre" : "right";
  return row === "middle" && col === "centre" ? "centre" : `${row} ${col}`;
}

export function markLocation(m: Pick<LiveMark, "page" | "word" | "point">): string {
  if (m.word) return `Page ${m.page} · ayah ${m.word.ayah}, word ${m.word.wordIndex}`;
  const cell = m.point ? cellAt(m.page, m.point) : undefined;
  if (cell) return `Page ${m.page} · line ${cell.line}, word ${cell.word}`;
  return `Page ${m.page} · ${m.point ? pointArea(m.point) : "spot on page"}`;
}

export function LiveSession({ code, role, book: urlBook = null, studentId = null, startPage = 1, latencyMs, forced }: Props) {
  const live = useLiveSession({ code, role, book: urlBook, latencyMs });
  const prefs = usePrefs();
  const peerStatus: PeerStatus = forced === "waiting" ? "waiting" : forced === "reconnecting" ? "reconnecting" : live.peerStatus;
  const ended = forced === "ended" || live.shared.endedAt !== null;
  const studentPage = live.shared.position?.page ?? startPage;

  if (ended) {
    if (role === "teacher") {
      return <TeacherEnded code={code} studentId={studentId} book={live.book} shared={live.shared} />;
    }
    return <StudentEnded shared={live.shared} />;
  }

  const peerName = role === "teacher" ? "Student" : "Teacher";
  const banners = (
    <div className="space-y-2 px-3 pt-2 empty:hidden">
      {!live.online && (
        <Banner tone="danger" icon="wifiOff">
          You are offline. Keep reading; changes will sync when the connection returns.
        </Banner>
      )}
      {live.online && peerStatus === "reconnecting" && (
        <Banner tone="warning" icon="wifiOff">
          {peerName}&apos;s connection dropped. Reconnecting… nothing is lost.
        </Banner>
      )}
      {live.online && (peerStatus === "waiting" || peerStatus === "left") && (
        <Banner tone="info" icon="clock" action={role === "teacher" ? <CopyLink code={code} book={live.book} /> : undefined}>
          {peerStatus === "left" ? `${peerName} left the session. ` : `Waiting for ${peerName.toLowerCase()} to join. `}
          Room code <strong className="font-mono tracking-widest">{code}</strong>
        </Banner>
      )}
    </div>
  );

  const connectionDots = (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <ConnectionDot state={live.online ? "connected" : "offline"} who="You" />
      <ConnectionDot state={peerToConnection(peerStatus)} who={peerName} />
    </div>
  );

  if (role === "student") {
    return (
      <StudentView
        book={live.book}
        page={studentPage}
        position={live.shared.position}
        marks={live.shared.marks}
        readingTheme={prefs.readingTheme}
        speakLetters={prefs.letterSounds}
        banners={banners}
        connection={connectionDots}
        onPosition={live.setPosition}
        onEnd={live.endSession}
      />
    );
  }

  return (
    <TeacherView
      book={live.book}
      studentPage={studentPage}
      position={live.shared.position}
      marks={live.shared.marks}
      readingTheme={prefs.readingTheme}
      banners={banners}
      connection={connectionDots}
      code={code}
      onMark={(t, type) => live.setMark(t.page, { word: t.word && wordRef(t.word), point: t.point }, type, t.markId)}
      onClear={live.clearMark}
      onEnd={live.endSession}
    />
  );
}

/** One page of either book, with the student's position, marks and the teacher's selection. */
function SessionPage({
  book,
  page,
  marks,
  position,
  selected,
  readingTheme,
  speakLetters = false,
  onWord,
  onPoint,
  onPin,
}: {
  book: Book;
  page: number;
  marks: Record<string, LiveMark>;
  position: StudentPosition | null;
  selected?: Target | null;
  readingTheme: ReadingTheme;
  speakLetters?: boolean;
  onWord: (w: QuranWord) => void;
  onPoint: (p: PagePoint) => void;
  onPin?: (id: string) => void;
}) {
  const markMap = useMemo(() => marksByWord(marks), [marks]);
  const here = position?.page === page ? position : null;

  if (book === "qaida") {
    const pins = Object.values(marks)
      .filter((m) => m.page === page && m.point)
      .map((m) => ({ id: m.id, point: m.point!, markType: m.markType, label: m.n ? String(m.n) : undefined }));
    return (
      <ImagePageView
        page={page}
        pins={pins}
        position={here?.point ?? null}
        selected={selected && !selected.markId ? (selected.point ?? null) : null}
        selectedPinId={selected?.markId ?? null}
        onPointTap={onPoint}
        onPinTap={onPin}
        readingTheme={readingTheme}
        speakLetters={speakLetters}
        className="mx-auto max-w-2xl"
      />
    );
  }

  return (
    <PageSurface
      pageNumber={page}
      positionKey={here?.word ? wordKey(here.word) : null}
      selectedKey={selected?.word?.key ?? null}
      marks={markMap}
      readingTheme={readingTheme}
      onWordTap={onWord}
      className="mx-auto max-w-4xl"
    />
  );
}

function StudentEnded({ shared }: { shared: SharedState }) {
  const marks = Object.values(shared.marks);
  const stars = marks.filter((m) => m.markType === "good").length;
  const pages = shared.pages.length;
  return (
    <main id="main" className="grid min-h-dvh place-items-center bg-gradient-to-br from-tile-sun via-tile-mint to-tile-sky p-6">
      <div role="status" className="w-full max-w-md rounded-3xl bg-surface p-8 text-center shadow-xl">
        <div aria-hidden className="mb-4 flex justify-center gap-2">
          {Array.from({ length: Math.min(Math.max(stars, 1), 5) }, (_, i) => (
            <span key={i} className="animate-pop-in text-star" style={{ animationDelay: `${i * 120}ms` }}>
              <Icon name="star" size={40} strokeWidth={2.5} />
            </span>
          ))}
        </div>
        <h1 className="text-3xl font-semibold">{stars > 0 ? "MashaAllah, well done!" : "Well done today!"}</h1>
        <p className="mt-3 text-lg text-muted">
          {stars > 0
            ? `You earned ${stars} ${stars === 1 ? "star" : "stars"}`
            : "You read with your teacher"}
          {pages > 0 && ` on ${pages} ${pages === 1 ? "page" : "pages"}`}.
        </p>
        <p className="mt-1 text-muted">Your teacher has your marks. See you next lesson!</p>
        <ButtonLink href={supabaseAuth ? "/join" : "/student"} size="lg" className="mt-6 w-full">
          {supabaseAuth ? "Done" : "Back to home"}
        </ButtonLink>
      </div>
    </main>
  );
}

function TeacherEnded({
  code,
  studentId,
  book,
  shared,
}: {
  code: string;
  studentId: string | null;
  book: Book;
  shared: SharedState;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const markCount = Object.keys(shared.marks).length;

  if (!studentId) {
    return (
      <FullScreenMessage title="Session ended">
        <p>
          This lesson wasn’t started for a particular student, so it can’t be saved. Start lessons from a
          student’s name on your home page to keep a summary.
        </p>
        <ButtonLink href={supabaseAuth ? "/welcome" : "/teacher"} size="lg" className="w-full">
          Back to home
        </ButtonLink>
      </FullScreenMessage>
    );
  }

  return (
    <FullScreenMessage title="Session ended">
      <p>
        {markCount} {markCount === 1 ? "mark" : "marks"} on {shared.pages.length}{" "}
        {shared.pages.length === 1 ? "page" : "pages"}. Save the lesson to see its summary and update progress.
      </p>
      {error && <Banner tone="danger">{error}</Banner>}
      <Button
        size="lg"
        className="w-full"
        icon="check"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await saveLiveLesson({
              code,
              studentId,
              book,
              startedAt: shared.startedAt,
              pages: shared.pages,
              note: sessionStorage.getItem(`sabaq:note:${code}`) ?? "",
              marks: Object.values(shared.marks),
            });
            if (result.ok) router.push(supabaseAuth ? `/lessons/${result.id}` : `/teacher/sessions/${result.id}`);
            else setError(result.message);
          })
        }
      >
        {pending ? "Saving…" : "Save and view summary"}
      </Button>
    </FullScreenMessage>
  );
}

function EndButton({ onEnd, large }: { onEnd: () => void; large?: boolean }) {
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return (
      <Button variant="secondary" size={large ? "lg" : "md"} onClick={() => setConfirming(true)}>
        End session
      </Button>
    );
  }
  return (
    <div className="flex items-center gap-2" role="group" aria-label="Confirm end session">
      <Button variant="danger" onClick={onEnd}>
        Yes, end
      </Button>
      <Button variant="ghost" onClick={() => setConfirming(false)}>
        Cancel
      </Button>
    </div>
  );
}

function CopyLink({ code, book }: { code: string; book: Book }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="secondary"
      icon={copied ? "check" : "copy"}
      onClick={async () => {
        const url = `${window.location.origin}/session/${code}?role=student&book=${book}`;
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
        } catch {
          window.prompt("Copy this link for the student", url);
        }
      }}
    >
      {copied ? "Copied" : "Copy student link"}
    </Button>
  );
}

// ---- Student ---------------------------------------------------------------------

function StudentView({
  book,
  page,
  position,
  marks,
  readingTheme,
  speakLetters = false,
  banners,
  connection,
  onPosition,
  onEnd,
}: {
  book: Book;
  page: number;
  position: StudentPosition | null;
  marks: Record<string, LiveMark>;
  readingTheme: ReadingTheme;
  speakLetters?: boolean;
  banners: ReactNode;
  connection: ReactNode;
  onPosition: (page: number, anchor?: { word?: ReturnType<typeof wordRef>; point?: PagePoint }) => void;
  onEnd: () => void;
}) {
  const go = (p: number) => onPosition(p);
  return (
    <div className="flex h-dvh flex-col bg-bg">
      <header className="flex items-center justify-between gap-3 border-b border-border bg-surface px-3 py-2">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold tabular-nums">
            {book === "qaida" ? "Qaida page" : "Page"} {page}
          </span>
          {connection}
        </div>
        <EndButton onEnd={onEnd} />
      </header>
      {banners}
      <main id="main" className="min-h-0 flex-1 overflow-y-auto p-2 sm:p-4">
        <p className="mb-2 text-center text-sm text-muted">Tap the word you are reading.</p>
        <PageTurner onNext={() => go(page + 1)} onPrev={() => go(Math.max(1, page - 1))}>
          <SessionPage
            book={book}
            page={page}
            marks={marks}
            position={position}
            readingTheme={readingTheme}
            speakLetters={speakLetters}
            onWord={(w) => onPosition(page, { word: wordRef(w) })}
            onPoint={(p) => onPosition(page, { point: p })}
          />
        </PageTurner>
      </main>
      <PageNavBar book={book} page={page} onChange={go} large />
    </div>
  );
}

// ---- Teacher ---------------------------------------------------------------------

function TeacherView({
  book,
  studentPage,
  position,
  marks,
  readingTheme,
  banners,
  connection,
  code,
  onMark,
  onClear,
  onEnd,
}: {
  book: Book;
  studentPage: number;
  position: StudentPosition | null;
  marks: Record<string, LiveMark>;
  readingTheme: ReadingTheme;
  banners: ReactNode;
  connection: ReactNode;
  code: string;
  onMark: (target: Target, type: MarkType) => void;
  onClear: (id: string) => void;
  onEnd: () => void;
}) {
  const [manualPage, setManualPage] = useState<number | null>(null);
  const [selected, setSelected] = useState<Target | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const follow = manualPage === null;
  const viewPage = follow ? studentPage : manualPage;
  const go = (p: number) => {
    setSelected(null);
    setManualPage(p);
  };
  const markMap = useMemo(() => marksByWord(marks), [marks]);
  const selectedMark = selected?.markId
    ? marks[selected.markId]
    : selected?.word
      ? markMap.get(selected.word.key)
      : undefined;
  const markList = Object.values(marks).sort((a, b) => (b.n ?? 0) - (a.n ?? 0));

  return (
    <div className="flex h-dvh flex-col bg-bg">
      <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-border bg-surface px-3 py-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="font-mono text-sm tracking-widest text-muted" aria-label={`Room code ${code}`}>
            {code}
          </span>
          {book !== "quran" && (
            <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-sm font-medium">{BOOK_LABEL[book]}</span>
          )}
          {connection}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-pressed={follow}
            onClick={() => setManualPage(follow ? viewPage : null)}
            className={cn(
              "inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm font-medium",
              follow ? "border-primary bg-primary-soft text-primary" : "border-border text-muted",
            )}
          >
            <Icon name={follow ? "eye" : "target"} size={18} />
            {follow ? "Following student" : "Follow student"}
          </button>
          <IconButton
            icon="panel"
            label={panelOpen ? "Hide marks panel" : "Show marks panel"}
            aria-expanded={panelOpen}
            onClick={() => setPanelOpen((o) => !o)}
            className="lg:hidden"
          />
          <EndButton onEnd={onEnd} />
        </div>
      </header>
      {banners}
      {!follow && viewPage !== studentPage && (
        <div className="px-3 pt-2">
          <Banner
            tone="info"
            icon="eye"
            action={
              <Button variant="secondary" onClick={() => setManualPage(null)}>
                Follow
              </Button>
            }
          >
            Student is on page {studentPage}.
          </Banner>
        </div>
      )}
      <div className="flex min-h-0 flex-1">
        <main id="main" className="min-h-0 flex-1 overflow-y-auto p-2 sm:p-4">
          <PageTurner onNext={() => go(viewPage + 1)} onPrev={() => go(Math.max(1, viewPage - 1))}>
            <SessionPage
              book={book}
              page={viewPage}
              marks={marks}
              position={position}
              selected={selected}
              readingTheme={readingTheme}
              onWord={(w) => setSelected((cur) => (cur?.word?.key === w.key ? null : { page: viewPage, word: w }))}
              onPoint={(p) => setSelected({ page: viewPage, point: p })}
              onPin={(id) => setSelected((cur) => (cur?.markId === id ? null : { page: viewPage, markId: id }))}
            />
          </PageTurner>
        </main>
        <aside
          aria-label="Session marks"
          className={cn(
            "w-80 shrink-0 flex-col overflow-y-auto border-l border-border bg-surface",
            panelOpen
              ? "fixed inset-y-0 right-0 z-40 flex w-[min(20rem,90vw)] shadow-2xl lg:static lg:shadow-none"
              : "hidden lg:flex",
          )}
        >
          <MarksPanel
            code={code}
            marks={markList}
            selectedId={selectedMark?.id ?? null}
            onSelect={(m) => {
              setManualPage(m.page === studentPage ? null : m.page);
              setSelected(
                m.word
                  ? { page: m.page, markId: m.id }
                  : { page: m.page, markId: m.id, point: m.point ?? undefined },
              );
              setPanelOpen(false);
            }}
            onClear={onClear}
            onClose={() => setPanelOpen(false)}
          />
        </aside>
      </div>
      {selected ? (
        <MarkPalette
          label={
            selectedMark
              ? `#${selectedMark.n} · ${markLocation(selectedMark)}`
              : selected.word
                ? `p.${selected.page} · ayah ${selected.word.ayah}, word ${selected.word.wordIndex}`
                : `p.${selected.page} · ${selected.point && cellAt(selected.page, selected.point) ? markLocation({ page: selected.page, word: null, point: selected.point }).replace(/^Page \d+ · /, "") : "spot you tapped"}`
          }
          current={selectedMark}
          onPick={(t) => {
            onMark({ ...selected, markId: selectedMark?.id }, t);
            setSelected(null);
          }}
          onRemove={() => {
            if (selectedMark) onClear(selectedMark.id);
            setSelected(null);
          }}
          onCancel={() => setSelected(null)}
        />
      ) : (
        <PageNavBar book={book} page={viewPage} onChange={go} extra={<JumpTo book={book} onJump={go} />} />
      )}
    </div>
  );
}

function MarkPalette({
  label,
  current,
  onPick,
  onRemove,
  onCancel,
}: {
  label: string;
  current?: LiveMark;
  onPick: (t: MarkType) => void;
  onRemove: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-label="Mark this word"
      className="border-t border-border bg-surface px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(0,0,0,.08)]"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm">
          <span className="font-medium">Mark</span> <span className="text-muted">{label}</span>
        </p>
        <IconButton icon="x" label="Cancel" onClick={onCancel} />
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {MARK_TYPES.map((t) => {
          const cfg = MARK_CONFIG[t];
          const active = current?.markType === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => onPick(t)}
              aria-pressed={active}
              className={cn(
                "flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border-2 px-2 text-sm font-medium",
                active ? "bg-surface-2" : "bg-surface hover:bg-surface-2",
              )}
              style={{ borderColor: cfg.colorVar }}
            >
              <span style={{ color: cfg.colorVar }}>
                <Icon name={cfg.icon} size={24} />
              </span>
              {cfg.shortLabel}
            </button>
          );
        })}
        {current && (
          <button
            type="button"
            onClick={onRemove}
            className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-danger/50 px-2 text-sm font-medium text-danger hover:bg-danger-soft"
          >
            <Icon name="trash" size={24} />
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

function MarksPanel({
  code,
  marks,
  selectedId,
  onSelect,
  onClear,
  onClose,
}: {
  code: string;
  marks: LiveMark[];
  selectedId: string | null;
  onSelect: (mark: LiveMark) => void;
  onClear: (id: string) => void;
  onClose: () => void;
}) {
  const noteKey = `sabaq:note:${code}`;
  const [note, setNote] = useState(() => sessionStorage.getItem(noteKey) ?? "");
  return (
    <div className="flex flex-1 flex-col p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          Marks <span className="text-muted tabular-nums">({marks.length})</span>
        </h2>
        <IconButton icon="x" label="Close panel" onClick={onClose} className="lg:hidden" />
      </div>
      {marks.length === 0 ? (
        <p className="rounded-xl bg-surface-2 p-4 text-sm text-muted">
          No marks yet. Tap a word on the page to mark it.
        </p>
      ) : (
        <ul className="space-y-2">
          {marks.map((m) => (
            <li
              key={m.id}
              className={cn(
                "flex items-center gap-2 rounded-xl border p-2",
                selectedId === m.id ? "border-focus bg-surface-2" : "border-border",
              )}
            >
              <button
                type="button"
                onClick={() => onSelect(m)}
                aria-label={`Select mark #${m.n}: ${MARK_CONFIG[m.markType].label}, ${markLocation(m)}`}
                className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-lg text-left hover:bg-surface-2"
              >
                <span
                  aria-hidden
                  className="grid size-7 shrink-0 place-items-center rounded-full bg-fg text-xs font-semibold text-bg"
                >
                  {m.n}
                </span>
                <span className="min-w-0">
                  <MarkChip type={m.markType} />
                  <span className="mt-1 block text-xs text-muted">{markLocation(m)}</span>
                </span>
              </button>
              <IconButton icon="trash" label={`Remove mark #${m.n}`} onClick={() => onClear(m.id)} />
            </li>
          ))}
        </ul>
      )}
      <label htmlFor="session-note" className="mt-5 mb-1.5 block font-medium">
        Quick note
      </label>
      <TextArea
        id="session-note"
        value={note}
        maxLength={500}
        placeholder="Only you and the guardian will see this"
        onChange={(e) => {
          setNote(e.target.value);
          sessionStorage.setItem(noteKey, e.target.value);
        }}
      />
      <p className="mt-auto pt-4 text-xs text-muted">
        Need a call? Keep using WhatsApp or Meet alongside this screen.{" "}
        <Link href="/privacy" className="underline">
          What is stored
        </Link>
      </p>
    </div>
  );
}
