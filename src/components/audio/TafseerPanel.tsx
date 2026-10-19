"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { DEFAULT_TAFSEER, LANGUAGE, TAFSEERS, tafseerById, type Block, type TafsirReply } from "@/lib/quran/tafseer";
import { nextAyah } from "@/lib/audio/recitation";
import { cn } from "@/lib/cn";
import { Field, Select, Switch } from "@/components/ui/Form";
import { Banner, Skeleton } from "@/components/ui/States";

const KEY = "sabaq:tafseer";
type Choice = { id: number; show: boolean };
const listeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cachedChoice: Choice = { id: DEFAULT_TAFSEER, show: true };

function readChoice(): Choice {
  const raw = localStorage.getItem(KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      const c = raw ? (JSON.parse(raw) as Partial<Choice>) : {};
      cachedChoice = { id: tafseerById(Number(c.id)) ? Number(c.id) : DEFAULT_TAFSEER, show: c.show !== false };
    } catch {
      cachedChoice = { id: DEFAULT_TAFSEER, show: true };
    }
  }
  return cachedChoice;
}

function saveChoice(patch: Partial<Choice>) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...readChoice(), ...patch }));
  } catch {
    // Private mode: the choice lasts for this visit only.
  }
  listeners.forEach((l) => l());
}

function useChoice(): Choice {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    readChoice,
    () => cachedChoice,
  );
}

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

function coverage(verses: string[]): string | null {
  if (verses.length < 2) return null;
  const ayahs = verses.map((v) => Number(v.split(":")[1]));
  return `Explains ayahs ${Math.min(...ayahs)}–${Math.max(...ayahs)} together`;
}

function TafsirText({ blocks, lang }: { blocks: Block[]; lang: "en" | "ur" | "ar" }) {
  return (
    <>
      {blocks.map((b, i) => {
        // English tafsirs quote Arabic in untagged paragraphs; go by the first letter.
        const quoted = !b.lang && lang === "en" && /^[^\p{L}]*\p{Script=Arabic}/u.test(b.runs.map((r) => r.text).join(""));
        const blockLang = b.lang ?? (quoted ? "ar" : lang);
        const rtl = blockLang !== "en";
        const Tag = b.kind === "h" ? "h3" : "p";
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

type Loaded = { key: string; reply: TafsirReply | null } | { key: string; error: true };

/** The tafsir of the ayah being recited; it moves on with the recitation. */
export function TafseerPanel({ surah, ayah }: { surah: number; ayah: number }) {
  const { id, show } = useChoice();
  const tafseer = tafseerById(id)!;
  const key = `${id}/${surah}/${ayah}`;
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!show) return;
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
  }, [id, surah, ayah, key, show, retry]);

  const current = loaded?.key === key ? loaded : null;
  const group = current && "reply" in current && current.reply ? `${id}:${current.reply.verses.join(",")}` : key;
  return (
    <section aria-labelledby="tafseer-heading" className="space-y-3 border-t border-border pt-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="tafseer-heading" className="text-lg font-semibold">
          Tafseer, ayah {ayah}
        </h2>
        <Switch id="show-tafseer" label="Show tafseer" checked={show} onChange={(v) => saveChoice({ show: v })} />
      </div>
      {show && (
        <>
          <Field id="tafseer" label="Tafseer">
            <Select id="tafseer" value={id} onChange={(e) => saveChoice({ id: Number(e.target.value) })}>
              {TAFSEERS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({LANGUAGE[t.lang]})
                </option>
              ))}
            </Select>
          </Field>
          <div aria-live="polite" aria-busy={!current}>
            {!current ? (
              <div className="space-y-2" role="status" aria-label="Loading tafseer">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-11/12" />
                <Skeleton className="h-5 w-2/3" />
              </div>
            ) : "error" in current ? (
              <Banner tone="warning" icon="wifiOff">
                Couldn’t load the tafseer. Check the connection and{" "}
                <button type="button" className="font-semibold underline" onClick={() => setRetry((n) => n + 1)}>
                  try again
                </button>
                .
              </Banner>
            ) : current.reply === null ? (
              <p className="text-muted">This tafseer has no note for this ayah.</p>
            ) : (
              <div className="space-y-2">
                {coverage(current.reply.verses) && (
                  <p className="text-sm font-medium text-muted" data-testid="tafseer-covers">
                    {coverage(current.reply.verses)}
                  </p>
                )}
                <div
                  key={group}
                  data-testid="tafseer-text"
                  className="max-h-[28rem] overflow-y-auto rounded-2xl bg-surface-2 p-4"
                  translate="no"
                >
                  <TafsirText blocks={current.reply.blocks} lang={tafseer.lang} />
                </div>
              </div>
            )}
          </div>
          <p className="text-xs text-muted">
            {tafseer.name} by {tafseer.author}, from{" "}
            <a href="https://quran.com" className="underline" rel="noopener noreferrer" target="_blank">
              Quran.com
            </a>{" "}
            (Quran Foundation).
          </p>
        </>
      )}
    </section>
  );
}
