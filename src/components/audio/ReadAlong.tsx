"use client";

import { useEffect, useRef, useState } from "react";
import {
  AYAH_COUNTS,
  RECITERS,
  SURAH_NAMES,
  TRANSLATION_VOICES,
  nextAyah,
  recitationUrl,
  translationVoiceUrl,
  voiceById,
  type ReciterId,
  type VoiceId,
} from "@/lib/audio/recitation";
import { cn } from "@/lib/cn";
import { useQuranFont } from "@/lib/quran/font";
import { LANGUAGE, TAFSEERS, TRANSLATIONS, type SurahReply, type TranslationId } from "@/lib/quran/tafseer";
import { Button } from "@/components/ui/Button";
import { Field, Select, Switch } from "@/components/ui/Form";
import { Banner, Skeleton } from "@/components/ui/States";
import { setListenPrefs, useListenPrefs } from "./listen-prefs";
import { TafsirNote, useTafsir } from "./tafsir";

type Status = "idle" | "loading" | "playing" | "paused" | "error";

const surahs = new Map<string, Promise<SurahReply>>();
function loadSurah(surah: number, translation: TranslationId): Promise<SurahReply> {
  const key = `${surah}?t=${translation}`;
  let p = surahs.get(key);
  if (!p) {
    p = fetch(`/api/quran/${key}`).then((r) => (r.ok ? (r.json() as Promise<SurahReply>) : Promise.reject(new Error(String(r.status)))));
    p.catch(() => surahs.delete(key));
    surahs.set(key, p);
  }
  return p;
}

/** The surah on screen, ayah by ayah: the one being recited is lit up, tap any ayah to play from it, and its tafsir sits under it. */
export function ReadAlong({ initialSurah = 1 }: { initialSurah?: number }) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const rows = useRef(new Map<number, HTMLLIElement>());
  const [reciter, setReciter] = useState<ReciterId>(RECITERS[0].id);
  const [surah, setSurah] = useState(initialSurah);
  const [ayah, setAyah] = useState(1);
  const [repeat, setRepeat] = useState(false);
  // After the Arabic, the chosen translation voice reads the same ayah before moving on.
  const [phase, setPhase] = useState<"ayah" | "voice">("ayah");
  // What the person asked for; the audio element's own events only refine the label.
  const [wantPlay, setWantPlay] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const playing = wantPlay && status !== "error";
  const prefs = useListenPrefs();
  const font = useQuranFont();
  const textKey = `${surah}?t=${prefs.translation}`;
  const [text, setText] = useState<{ key: string; reply?: SurahReply; error?: true } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const tafsir = useTafsir(prefs.tafsir, surah, ayah, prefs.showTafsir);
  const group = tafsir.status === "ready" ? tafsir.ayahs : [ayah];
  const noteAfter = Math.max(...group);
  const count = AYAH_COUNTS[surah - 1];

  useEffect(() => {
    let live = true;
    loadSurah(surah, prefs.translation).then(
      (reply) => live && setText({ key: textKey, reply }),
      () => live && setText({ key: textKey, error: true }),
    );
    return () => {
      live = false;
    };
  }, [surah, prefs.translation, textKey, attempt]);

  // Whenever the verse or reciter changes (or play is pressed), load it and play if wanted.
  const voice = prefs.voice === "off" ? null : prefs.voice;
  const reading = phase === "voice" && voice !== null;
  useEffect(() => {
    const el = audio.current;
    if (!el || !wantPlay) return;
    const src = reading && voice ? translationVoiceUrl(voice, surah, ayah) : recitationUrl(reciter, surah, ayah);
    if (el.src !== src) el.src = src;
    el.play().catch(() => setStatus("error"));
  }, [reciter, surah, ayah, wantPlay, reading, voice]);

  // Keep the ayah being recited in view.
  useEffect(() => {
    rows.current.get(ayah)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [ayah]);

  const goTo = (n: number) => {
    setPhase("ayah");
    setAyah(n);
  };
  const start = () => {
    setStatus("loading");
    setWantPlay(true);
  };
  const pause = () => {
    setWantPlay(false);
    audio.current?.pause();
    setStatus("paused");
  };
  const onEnded = () => {
    if (!reading && voice) {
      setStatus("loading");
      setPhase("voice");
      return;
    }
    if (repeat) {
      if (reading) setPhase("ayah");
      else void audio.current?.play();
      return;
    }
    const next = nextAyah(surah, ayah);
    if (next) {
      setStatus("loading");
      goTo(next.ayah);
    } else {
      setWantPlay(false);
      setStatus("idle");
      setPhase("ayah");
    }
  };

  const reply = text?.key === textKey ? text.reply : undefined;
  const failed = text?.key === textKey && text.error;
  const translationLang = TRANSLATIONS.find((t) => t.id === prefs.translation)!.lang;

  return (
    <div className="space-y-4">
      <audio
        ref={audio}
        preload="none"
        onPlaying={() => setStatus("playing")}
        onWaiting={() => setStatus("loading")}
        onEnded={onEnded}
        onError={() => {
          // A missing translation recording shouldn't stop the recitation.
          if (reading) return onEnded();
          setWantPlay(false);
          setStatus("error");
        }}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="surah" label="Surah">
          <Select
            id="surah"
            value={surah}
            onChange={(e) => {
              setSurah(Number(e.target.value));
              goTo(1);
            }}
          >
            {SURAH_NAMES.map((name, i) => (
              <option key={name} value={i + 1}>
                {i + 1}. {name}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="reciter" label="Reciter">
          <Select id="reciter" value={reciter} onChange={(e) => setReciter(e.target.value as ReciterId)}>
            {RECITERS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="translation" label="Translation">
          <Select
            id="translation"
            value={prefs.translation}
            onChange={(e) => setListenPrefs({ translation: Number(e.target.value) as TranslationId })}
          >
            {TRANSLATIONS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({LANGUAGE[t.lang]})
              </option>
            ))}
          </Select>
        </Field>
        <Field id="tafseer" label="Tafsir">
          <Select id="tafseer" value={prefs.tafsir} onChange={(e) => setListenPrefs({ tafsir: Number(e.target.value) })}>
            {TAFSEERS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({LANGUAGE[t.lang]})
              </option>
            ))}
          </Select>
        </Field>
        <Field
          id="voice"
          label="Hear the translation"
          hint={voice ? "Read after each ayah. The translation shown is the one being read." : "Optional: a recorded voice reads the meaning after each ayah."}
          className="sm:col-span-2"
        >
          <Select
            id="voice"
            value={prefs.voice}
            onChange={(e) => {
              const v = voiceById(e.target.value);
              setPhase("ayah");
              setListenPrefs(v ? { voice: v.id as VoiceId, translation: v.translation } : { voice: "off" });
            }}
          >
            <option value="off">Off</option>
            {TRANSLATION_VOICES.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}: {v.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="material edge-below sticky top-0 z-20 -mx-4 flex flex-wrap items-center gap-2 px-4 py-3 sm:-mx-5 sm:px-5">
        <Button icon={playing ? "x" : "play"} onClick={() => (playing ? pause() : start())} aria-live="polite">
          {status === "loading" && playing ? "Loading…" : playing ? "Pause" : status === "paused" ? "Resume" : "Play"}
        </Button>
        <Button variant="secondary" icon="chevronLeft" disabled={ayah <= 1} onClick={() => goTo(Math.max(1, ayah - 1))}>
          <span className="sr-only sm:not-sr-only">Previous</span>
        </Button>
        <Button
          variant="secondary"
          iconEnd="chevronRight"
          disabled={!nextAyah(surah, ayah)}
          onClick={() => goTo(nextAyah(surah, ayah)?.ayah ?? ayah)}
        >
          <span className="sr-only sm:not-sr-only">Next</span>
        </Button>
        <p className="min-w-0 flex-1 truncate text-sm text-muted" aria-live="polite">
          {SURAH_NAMES[surah - 1]}, ayah {ayah} of {count}
          {reading && playing && ` · ${voiceById(voice!)!.label} translation`}
        </p>
        <Switch id="repeat" label="Repeat ayah" checked={repeat} onChange={setRepeat} />
        <Switch id="show-tafseer" label="Show tafsir" checked={prefs.showTafsir} onChange={(v) => setListenPrefs({ showTafsir: v })} />
      </div>

      {status === "error" && (
        <Banner tone="warning" icon="wifiOff">
          Couldn’t load the recitation. Check the internet connection and try again.
        </Banner>
      )}

      {failed ? (
        <Banner tone="warning" icon="wifiOff">
          Couldn’t load the surah. Check the connection and{" "}
          <button type="button" className="font-semibold underline" onClick={() => setAttempt((n) => n + 1)}>
            try again
          </button>
          .
        </Banner>
      ) : font === "failed" ? (
        <Banner tone="warning" icon="info">
          The Quran font couldn’t load, so the Arabic text isn’t shown. Check the connection and reload the page.
        </Banner>
      ) : !reply || font === "loading" ? (
        <div className="space-y-3" role="status" aria-label="Loading the surah">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      ) : (
        <ol className="space-y-3" aria-label={`Surah ${SURAH_NAMES[surah - 1]}`} translate="no">
          {reply.verses.map((v) => {
            const current = v.number === ayah;
            const inGroup = group.length > 1 && group.includes(v.number);
            return (
              <li
                key={v.key}
                ref={(el) => {
                  if (el) rows.current.set(v.number, el);
                  else rows.current.delete(v.number);
                }}
                data-ayah={v.number}
                aria-current={current ? "true" : undefined}
                className="scroll-mt-24 space-y-3"
              >
                <button
                  type="button"
                  onClick={() => {
                    goTo(v.number);
                    start();
                  }}
                  aria-label={`Play ayah ${v.number}`}
                  className={cn(
                    "block w-full rounded-2xl border-2 p-4 text-left transition-colors hover:border-primary/50",
                    current ? "border-primary bg-primary-soft" : inGroup ? "border-primary/30 bg-surface" : "border-border bg-surface",
                  )}
                >
                  <span className="flex items-start gap-3">
                    <span
                      aria-hidden
                      className={cn(
                        "grid size-9 shrink-0 place-items-center rounded-full text-sm font-semibold",
                        current ? "bg-primary text-primary-fg" : "bg-surface-2 text-muted",
                      )}
                    >
                      {v.number}
                    </span>
                    <span className="min-w-0 flex-1 space-y-2">
                      <span lang="ar" dir="rtl" className="block font-[IndoPakNastaleeq] text-3xl leading-[2.4]">
                        {v.text}
                      </span>
                      {v.translation && (
                        <span
                          lang={translationLang}
                          dir={translationLang === "ur" ? "rtl" : "ltr"}
                          className={cn("block text-muted", translationLang === "ur" ? "font-arabic text-xl leading-loose" : "leading-relaxed")}
                        >
                          {v.translation}
                        </span>
                      )}
                    </span>
                  </span>
                </button>
                {v.number === noteAfter && <TafsirNote state={tafsir} tafsirId={prefs.tafsir} />}
              </li>
            );
          })}
        </ol>
      )}

      <p className="text-xs text-muted">
        Quran text, translation and tafsir from{" "}
        <a href="https://quran.com" className="underline" rel="noopener noreferrer" target="_blank">
          Quran.com
        </a>{" "}
        (Quran Foundation). Quran fonts provided by{" "}
        <a href="https://quran.foundation" className="underline" rel="noopener noreferrer" target="_blank">
          Quran Foundation
        </a>
        . Recitation streamed from{" "}
        <a href="https://everyayah.com" className="underline" rel="noopener noreferrer" target="_blank">
          EveryAyah.com
        </a>
        {voice && `, translation read by ${voiceById(voice)!.reader}`}
        .
      </p>
    </div>
  );
}
