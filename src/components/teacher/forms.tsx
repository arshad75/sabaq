"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Select, TextArea, TextInput } from "@/components/ui/Form";
import { Banner } from "@/components/ui/States";
import { uid } from "@/lib/uid";
import { ASSIGNMENT_KIND_LABEL } from "@/lib/format";
import type { AssignmentKind } from "@/lib/domain/types";

export function InviteLink({ classId, initialExpiry }: { classId: string; initialExpiry: string }) {
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const expiry = token ? "in 7 days" : initialExpiry;
  // Real tokens are created server-side and only their hash is stored (class_members.invite_token_hash).
  const link = token ? `/invite/${classId}/${token}` : `/invite/${classId}/••••••••`;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2 font-mono text-sm break-all">
        {link}
      </div>
      <p className="text-sm text-muted">Expires {expiry}. A guardian must approve before you see the child.</p>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          icon={copied ? "check" : "copy"}
          disabled={!token}
          onClick={async () => {
            if (!token) return;
            try {
              await navigator.clipboard.writeText(`${window.location.origin}${link}`);
              setCopied(true);
            } catch {
              window.prompt("Copy this link", `${window.location.origin}${link}`);
            }
          }}
        >
          {copied ? "Copied" : "Copy link"}
        </Button>
        <Button
          icon="link"
          onClick={() => {
            setToken(uid());
            setCopied(false);
          }}
        >
          {token ? "Make a new link" : "Create invite link"}
        </Button>
      </div>
    </div>
  );
}

export function TeacherNoteForm({ initial = "", label = "Private note" }: { initial?: string; label?: string }) {
  const [note, setNote] = useState(initial);
  const [saved, setSaved] = useState(false);
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        setSaved(true);
      }}
    >
      <Field id="teacher-note" label={label} hint="Short and factual. Avoid sensitive details about the child.">
        <TextArea
          id="teacher-note"
          value={note}
          maxLength={500}
          onChange={(e) => {
            setNote(e.target.value);
            setSaved(false);
          }}
        />
      </Field>
      <div className="flex items-center gap-3">
        <Button type="submit">Save note</Button>
        {saved && (
          <span role="status" className="text-sm text-success">
            Saved
          </span>
        )}
      </div>
    </form>
  );
}

export function AssignForm({ defaultFrom, defaultTo, defaultDue }: { defaultFrom: number; defaultTo: number; defaultDue: string }) {
  const [kind, setKind] = useState<AssignmentKind>("recent_revision");
  const [from, setFrom] = useState(String(defaultFrom));
  const [to, setTo] = useState(String(defaultTo));
  const [due, setDue] = useState(defaultDue);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const f = Number(from);
        const t = Number(to);
        if (!Number.isInteger(f) || !Number.isInteger(t) || f < 1 || t > 604 || f > t) {
          setError("Enter a page range between 1 and 604, start before end.");
          return;
        }
        setError(null);
        setDone(`${ASSIGNMENT_KIND_LABEL[kind]}, pages ${f}–${t}, due ${due} assigned.`);
      }}
    >
      <Field id="assign-kind" label="Type">
        <Select id="assign-kind" value={kind} onChange={(e) => setKind(e.target.value as AssignmentKind)}>
          {(Object.keys(ASSIGNMENT_KIND_LABEL) as AssignmentKind[]).map((k) => (
            <option key={k} value={k}>
              {ASSIGNMENT_KIND_LABEL[k]}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field id="assign-from" label="From page">
          <TextInput id="assign-from" inputMode="numeric" value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field id="assign-to" label="To page">
          <TextInput id="assign-to" inputMode="numeric" value={to} onChange={(e) => setTo(e.target.value)} />
        </Field>
      </div>
      <Field id="assign-due" label="Due date" error={error}>
        <TextInput id="assign-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
      </Field>
      <Button type="submit" icon="plus" className="w-full">
        Assign
      </Button>
      {done && <Banner tone="success">{done}</Banner>}
    </form>
  );
}
