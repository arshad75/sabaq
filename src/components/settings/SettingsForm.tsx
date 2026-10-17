"use client";

import { Suspense } from "react";
import { setPrefs, usePrefs, type ReadingTheme, type ThemePref } from "@/lib/prefs";
import { usePage } from "@/lib/quran/use-page";
import { ReadingView } from "@/components/reading/ReadingView";
import { Card, CardHeader } from "@/components/ui/Card";
import { Field, SegmentedControl, Select, Switch } from "@/components/ui/Form";
import { MarkLegend } from "@/components/ui/Indicators";
import { Button } from "@/components/ui/Button";
import { logOut } from "@/lib/auth/actions";
import { Skeleton } from "@/components/ui/States";
import { letterFor, speakLetter, type LetterName } from "@/lib/qaida/letters";
import { sayLabel } from "@/lib/audio/speak";

const TEST_LETTER = letterFor(1, { id: "2:1" }) as LetterName;

function ReadingPreview({ theme }: { theme: ReadingTheme }) {
  const page = usePage(1);
  return <ReadingView page={{ ...page, lines: page.lines.slice(0, 2) }} readingTheme={theme} />;
}

export function SettingsForm() {
  const prefs = usePrefs();
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Appearance" />
        <div className="space-y-5">
          <SegmentedControl<ThemePref>
            name="theme"
            label="App theme"
            value={prefs.theme}
            onChange={(theme) => setPrefs({ theme })}
            options={[
              { value: "system", label: "Automatic" },
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
            ]}
          />
          <SegmentedControl<ReadingTheme>
            name="reading-theme"
            label="Reading page"
            value={prefs.readingTheme}
            onChange={(readingTheme) => setPrefs({ readingTheme })}
            options={[
              { value: "paper", label: "Paper" },
              { value: "sepia", label: "Sepia" },
              { value: "night", label: "Night" },
            ]}
          />
          <div>
            <label htmlFor="text-size" className="mb-1.5 block font-medium">
              Reading text size <span className="text-muted tabular-nums">({Math.round(prefs.textScale * 100)}%)</span>
            </label>
            <input
              id="text-size"
              type="range"
              min={0.8}
              max={1.6}
              step={0.1}
              value={prefs.textScale}
              onChange={(e) => setPrefs({ textScale: Number(e.target.value) })}
              className="h-11 w-full accent-[var(--primary)]"
            />
          </div>
          <Suspense fallback={<Skeleton className="h-28 w-full" />}>
            <ReadingPreview theme={prefs.readingTheme} />
          </Suspense>
        </div>
      </Card>

      <Card>
        <CardHeader title="Language" />
        <Field id="language" label="App language" hint="Urdu, Hindi and Arabic are planned.">
          <Select id="language" value={prefs.language} onChange={() => setPrefs({ language: "en" })}>
            <option value="en">English</option>
            <option disabled>اردو (coming later)</option>
            <option disabled>हिन्दी (coming later)</option>
            <option disabled>العربية (coming later)</option>
          </Select>
        </Field>
      </Card>

      <Card>
        <CardHeader
          title="Marks"
          description="Every mark has its own icon as well as a colour, so it is clear without relying on colour."
        />
        <MarkLegend />
      </Card>

      <Card>
        <CardHeader title="Sounds" description="Uses this device’s own voices; nothing is sent anywhere." />
        <div className="space-y-4">
          <Switch
            id="letter-sounds"
            label="Say the letter when a child taps it in the Qaida"
            checked={prefs.letterSounds}
            onChange={(v) => setPrefs({ letterSounds: v })}
          />
          <Switch
            id="button-voices"
            label="Read buttons aloud on the child’s screens, for children who can’t read yet"
            checked={prefs.buttonVoices}
            onChange={(v) => setPrefs({ buttonVoices: v })}
          />
          <Switch
            id="effects"
            label="Sound effects in lessons"
            description="A cheerful chime for right answers and a soft tone for mistakes."
            checked={prefs.effects}
            onChange={(v) => setPrefs({ effects: v })}
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" icon="volume" onClick={() => speakLetter(TEST_LETTER)}>
              Test letter sound
            </Button>
            <Button variant="ghost" onClick={() => sayLabel("Next page")}>
              Test button voice
            </Button>
            <span className="text-sm text-muted">You should hear “Alif” in Arabic, then “Next page”.</span>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Notifications" description="In-app reminders. Email is optional and off for now." />
        <Switch
          id="notify-assignments"
          label="New reading assigned"
          checked={prefs.notifyAssignments}
          onChange={(v) => setPrefs({ notifyAssignments: v })}
        />
        <Switch
          id="notify-summary"
          label="Lesson summary ready"
          checked={prefs.notifySessionSummary}
          onChange={(v) => setPrefs({ notifySessionSummary: v })}
        />
      </Card>

      <Card>
        <CardHeader title="Account" />
        <form action={logOut}>
          <Button type="submit" variant="secondary" icon="logout">
            Sign out
          </Button>
        </form>
      </Card>
    </div>
  );
}
