"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { DEFAULT_TAFSEER, TAFSEERS, tafseerById } from "@/lib/quran/tafseer";
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

const texts = new Map<string, Promise<string | null>>();

function loadTafseer(id: number, surah: number, ayah: number): Promise<string | null> {
  const key = `${id}/${surah}/${ayah}`;
  let p = texts.get(key);
  if (!p) {
    p = fetch(`/api/tafseer/${key}`).then(async (r) => {
      if (r.status === 404) return null;
      if (!r.ok) throw new Error(String(r.status));
      return ((await r.json()) as { text: string }).text;
    });
    p.catch(() => texts.delete(key));
    texts.set(key, p);
  }
  return p;
}

type Loaded = { key: string; text: string | null } | { key: string; error: true };

/** The tafseer of the ayah being recited; it moves on with the recitation. */
export function TafseerPanel({ surah, ayah }: { surah: number; ayah: number }) {
  const { id, show } = useChoice();
  const tafseer = tafseerById(id)!;
  const key = `${id}/${surah}/${ayah}`;
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!show) return;
    let live = true;
    loadTafseer(id, surah, ayah).then(
      (text) => live && setLoaded({ key, text }),
      () => live && setLoaded({ key, error: true }),
    );
    // Ready before the recitation moves on.
    const next = nextAyah(surah, ayah);
    if (next) void loadTafseer(id, surah, next.ayah).catch(() => {});
    return () => {
      live = false;
    };
  }, [id, surah, ayah, key, show, retry]);

  const current = loaded?.key === key ? loaded : null;
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
                  {t.name}
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
            ) : current.text === null ? (
              <p className="text-muted">This tafseer has no note for this ayah.</p>
            ) : (
              <p
                key={key}
                lang={tafseer.lang}
                dir={tafseer.lang === "ar" ? "rtl" : "ltr"}
                data-testid="tafseer-text"
                className={cn(
                  "max-h-[28rem] overflow-y-auto rounded-2xl bg-surface-2 p-4 whitespace-pre-wrap",
                  tafseer.lang === "ar" ? "font-arabic text-xl leading-loose" : "leading-relaxed",
                )}
              >
                {current.text}
              </p>
            )}
          </div>
          <p className="text-xs text-muted">
            By {tafseer.author}, via the{" "}
            <a href="http://api.quran-tafseer.com" className="underline" rel="noopener noreferrer" target="_blank">
              Quran Tafseer API
            </a>
            .
          </p>
        </>
      )}
    </section>
  );
}
