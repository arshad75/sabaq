"use client";

import { useEffect, useState } from "react";
import { nextAyah } from "@/lib/audio/recitation";
import { cn } from "@/lib/cn";
import { tafseerById, type Block, type TafsirReply } from "@/lib/quran/tafseer";
import { Banner, Skeleton } from "@/components/ui/States";

const replies = new Map<string, Promise<TafsirReply | null>>();

function loadTafsir(id: number, surah: number, ayah: number): Promise<TafsirReply | null> {
  const key = `${id}/${surah}/${ayah}`;
  let p = replies.get(key);
  if (!p) {
    p = fetch(`/api/tafseer/${key}`).then(async (r) => {
      if (r.status === 404) return null;
      if (!r.ok) throw new Error(String(r.status));
      const reply = (await r.json()) as TafsirReply;
      // One explanation often covers several ayahs; they all share it.
      for (const v of reply.verses) {
        const [s, a] = v.split(":");
        if (Number(s) === surah) replies.set(`${id}/${s}/${a}`, Promise.resolve(reply));
      }
      return reply;
    });
    p.catch(() => replies.delete(key));
    replies.set(key, p);
  }
  return p;
}

export type TafsirState =
  | { status: "off" | "loading" }
  | { status: "error"; retry: () => void }
  | { status: "ready"; reply: TafsirReply | null; ayahs: number[] };

/** The tafsir note for an ayah, and which ayahs of this surah that note explains. */
export function useTafsir(id: number, surah: number, ayah: number, on: boolean): TafsirState {
  const key = `${id}/${surah}/${ayah}`;
  const [loaded, setLoaded] = useState<{ key: string; reply?: TafsirReply | null; error?: true } | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!on) return;
    let live = true;
    loadTafsir(id, surah, ayah).then(
      (reply) => live && setLoaded({ key, reply }),
      () => live && setLoaded({ key, error: true }),
    );
    // Ready before the recitation moves on.
    const next = nextAyah(surah, ayah);
    if (next) void loadTafsir(id, surah, next.ayah).catch(() => {});
    return () => {
      live = false;
    };
  }, [id, surah, ayah, key, on, attempt]);

  if (!on) return { status: "off" };
  if (loaded?.key !== key) return { status: "loading" };
  if (loaded.error) return { status: "error", retry: () => setAttempt((n) => n + 1) };
  const reply = loaded.reply ?? null;
  const ayahs = reply ? reply.verses.filter((v) => v.startsWith(`${surah}:`)).map((v) => Number(v.split(":")[1])) : [ayah];
  return { status: "ready", reply, ayahs: ayahs.length ? ayahs : [ayah] };
}

function TafsirText({ blocks, lang }: { blocks: Block[]; lang: "en" | "ur" | "ar" }) {
  return (
    <>
      {blocks.map((b, i) => {
        // English tafsirs quote Arabic in untagged paragraphs; go by the first letter.
        const quoted = !b.lang && lang === "en" && /^[^\p{L}]*\p{Script=Arabic}/u.test(b.runs.map((r) => r.text).join(""));
        const blockLang = b.lang ?? (quoted ? "ar" : lang);
        const rtl = blockLang !== "en";
        const Tag = b.kind === "h" ? "h4" : "p";
        return (
          <Tag
            key={i}
            lang={blockLang}
            dir={rtl ? "rtl" : "ltr"}
            className={cn(
              "whitespace-pre-wrap",
              b.kind === "h" ? "mt-4 mb-1 font-semibold first:mt-0" : "mb-3 last:mb-0",
              rtl ? "font-arabic text-xl leading-loose" : "leading-relaxed",
            )}
          >
            {b.runs.map((r, j) =>
              r.arabic && !rtl ? (
                <span key={j} lang="ar" dir="rtl" className="font-arabic text-xl">
                  {r.text}
                </span>
              ) : (
                r.text
              ),
            )}
          </Tag>
        );
      })}
    </>
  );
}

/** The tafsir note, shown under the ayahs it explains. */
export function TafsirNote({ state, tafsirId }: { state: TafsirState; tafsirId: number }) {
  const tafsir = tafseerById(tafsirId)!;
  if (state.status === "off") return null;
  const range =
    state.status === "ready" && state.ayahs.length > 1
      ? `Ayahs ${Math.min(...state.ayahs)}–${Math.max(...state.ayahs)}`
      : state.status === "ready"
        ? `Ayah ${state.ayahs[0]}`
        : null;
  return (
    <section
      aria-label={`Tafsir: ${tafsir.name}`}
      className="rounded-2xl border-2 border-primary/30 bg-surface-2 p-4"
      data-testid="tafsir-note"
    >
      <p className="mb-2 flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <span className="font-semibold text-primary">{tafsir.name}</span>
        {range && (
          <span className="text-muted" data-testid="tafsir-range">
            {range}
          </span>
        )}
      </p>
      <div aria-live="polite" aria-busy={state.status === "loading"}>
        {state.status === "loading" ? (
          <div className="space-y-2" role="status" aria-label="Loading tafsir">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-11/12" />
            <Skeleton className="h-5 w-2/3" />
          </div>
        ) : state.status === "error" ? (
          <Banner tone="warning" icon="wifiOff">
            Couldn’t load the tafsir. Check the connection and{" "}
            <button type="button" className="font-semibold underline" onClick={state.retry}>
              try again
            </button>
            .
          </Banner>
        ) : state.status !== "ready" ? null : state.reply === null ? (
          <p className="text-muted">This tafsir has no note for this ayah.</p>
        ) : (
          <div className="max-h-[26rem] overflow-y-auto" data-testid="tafsir-text" translate="no">
            <TafsirText blocks={state.reply.blocks} lang={tafsir.lang} />
          </div>
        )}
      </div>
      <p className="mt-3 text-xs text-muted">By {tafsir.author}, from Quran.com (Quran Foundation).</p>
    </section>
  );
}
