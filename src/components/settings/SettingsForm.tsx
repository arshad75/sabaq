"use client";

import { Suspense } from "react";
import { setPrefs, usePrefs, type ReadingTheme, type ThemePref } from "@/lib/prefs";
import { usePage } from "@/lib/quran/use-page";
import { ReadingView } from "@/components/reading/ReadingView";
import { Card, CardHeader } from "@/components/ui/Card";
import { Field, SegmentedControl, Select, Switch } from "@/components/ui/Form";
import { MarkLegend } from "@/components/ui/Indicators";
import { ButtonLink } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/States";

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
        <ButtonLink href="/" variant="secondary" icon="logout">
          Sign out
        </ButtonLink>
      </Card>
    </div>
  );
}
