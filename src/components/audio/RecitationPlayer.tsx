"use client";

import { useEffect, useRef, useState } from "react";
import { AYAH_COUNTS, RECITERS, SURAH_NAMES, nextAyah, recitationUrl, type ReciterId } from "@/lib/audio/recitation";
import { Button } from "@/components/ui/Button";
import { Field, Select, Switch } from "@/components/ui/Form";
import { Banner } from "@/components/ui/States";
import { TafseerPanel } from "./TafseerPanel";

type Status = "idle" | "loading" | "playing" | "paused" | "error";

/** Verse-by-verse recitation for listening along and memorising. */
export function RecitationPlayer({ initialSurah = 1 }: { initialSurah?: number }) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [reciter, setReciter] = useState<ReciterId>(RECITERS[0].id);
  const [surah, setSurah] = useState(initialSurah);
  const [ayah, setAyah] = useState(1);
  const [repeat, setRepeat] = useState(false);
  // What the person asked for; the audio element's own events only refine the label.
  const [wantPlay, setWantPlay] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const playing = wantPlay && status !== "error";

  // Whenever the verse or reciter changes (or play is pressed), load it and play if wanted.
  useEffect(() => {
    const el = audio.current;
    if (!el || !wantPlay) return;
    const src = recitationUrl(reciter, surah, ayah);
    if (el.src !== src) el.src = src;
    el.play().catch(() => setStatus("error"));
  }, [reciter, surah, ayah, wantPlay]);

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
    if (repeat) {
      audio.current?.play();
      return;
    }
    const next = nextAyah(surah, ayah);
    if (next) {
      setStatus("loading");
      setAyah(next.ayah);
    } else {
      setWantPlay(false);
      setStatus("idle");
    }
  };

  return (
    <div className="space-y-4">
      <audio
        ref={audio}
        preload="none"
        onPlaying={() => setStatus("playing")}
        onWaiting={() => setStatus("loading")}
        onEnded={onEnded}
        onError={() => {
          setWantPlay(false);
          setStatus("error");
        }}
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <Field id="reciter" label="Reciter">
          <Select id="reciter" value={reciter} onChange={(e) => setReciter(e.target.value as ReciterId)}>
            {RECITERS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="surah" label="Surah">
          <Select
            id="surah"
            value={surah}
            onChange={(e) => {
              setSurah(Number(e.target.value));
              setAyah(1);
            }}
          >
            {SURAH_NAMES.map((name, i) => (
              <option key={name} value={i + 1}>
                {i + 1}. {name}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="ayah" label="Ayah">
          <Select id="ayah" value={ayah} onChange={(e) => setAyah(Number(e.target.value))}>
            {Array.from({ length: AYAH_COUNTS[surah - 1] }, (_, i) => (
              <option key={i} value={i + 1}>
                {i + 1}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          size="lg"
          icon={playing ? "x" : "play"}
          onClick={() => (playing ? pause() : start())}
          aria-live="polite"
        >
          {status === "loading" ? "Loading…" : playing ? "Pause" : status === "paused" ? "Resume" : "Play"}
        </Button>
        <Button
          variant="secondary"
          icon="chevronLeft"
          disabled={ayah <= 1}
          onClick={() => setAyah((a) => Math.max(1, a - 1))}
        >
          Previous
        </Button>
        <Button
          variant="secondary"
          iconEnd="chevronRight"
          disabled={!nextAyah(surah, ayah)}
          onClick={() => setAyah((a) => nextAyah(surah, a)?.ayah ?? a)}
        >
          Next
        </Button>
        <Switch id="repeat" label="Repeat this ayah" checked={repeat} onChange={setRepeat} />
      </div>

      <p className="text-sm text-muted" aria-live="polite">
        {SURAH_NAMES[surah - 1]}, ayah {ayah} of {AYAH_COUNTS[surah - 1]}
      </p>
      {status === "error" && (
        <Banner tone="warning" icon="wifiOff">
          Couldn’t load the recitation. Check the internet connection and try again.
        </Banner>
      )}
      <p className="text-xs text-muted">
        Recitation streamed from{" "}
        <a href="https://everyayah.com" className="underline" rel="noopener noreferrer" target="_blank">
          EveryAyah.com
        </a>
        .
      </p>
      <TafseerPanel surah={surah} ayah={ayah} />
    </div>
  );
}
