"use client";

import { startTransition, useActionState, useState } from "react";
import { setHomework, type ActionState } from "@/lib/data/child-actions";
import { BOOK_LABEL } from "@/lib/books";
import type { Book } from "@/lib/domain/types";
import { Button } from "@/components/ui/Button";
import { Field, Select, TextInput } from "@/components/ui/Form";
import { Banner } from "@/components/ui/States";

const IDLE: ActionState = { status: "idle" };

export function HomeworkForm({
  studentId,
  book,
  suggestedPage,
  defaultDue,
}: {
  studentId: string;
  book: Book;
  suggestedPage: number;
  defaultDue: string;
}) {
  const [state, run, pending] = useActionState(setHomework, IDLE);
  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => run(data));
      }}
    >
      <input type="hidden" name="student" value={studentId} />
      <input type="hidden" name="book" value={book} />
      <Field id="hw-kind" label="Type">
        <Select id="hw-kind" name="kind" defaultValue="new">
          <option value="new">New lesson</option>
          <option value="recent_revision">Recent revision</option>
          <option value="old_revision">Old revision</option>
        </Select>
      </Field>
      <Field id="hw-due" label="Due">
        <TextInput id="hw-due" name="due" type="date" defaultValue={defaultDue} required />
      </Field>
      <Field id="hw-from" label={`${BOOK_LABEL[book]} page from`}>
        <TextInput id="hw-from" name="from" type="number" min={1} defaultValue={suggestedPage} required />
      </Field>
      <Field id="hw-to" label="to page">
        <TextInput id="hw-to" name="to" type="number" min={1} defaultValue={suggestedPage} required />
      </Field>
      <div className="sm:col-span-2">
        <Field id="hw-note" label="Note for the family (optional)">
          <TextInput id="hw-note" name="note" maxLength={300} placeholder="e.g. read each line three times slowly" />
        </Field>
      </div>
      {state.status !== "idle" && (
        <div className="sm:col-span-2">
          <Banner tone={state.status === "error" ? "danger" : "success"}>{state.message}</Banner>
        </div>
      )}
      <Button type="submit" icon="calendar" disabled={pending} className="sm:col-span-2">
        {pending ? "Saving…" : "Set homework"}
      </Button>
    </form>
  );
}

/** A destructive action that only enables once the person types "delete". */
export function ConfirmDelete({
  action,
  hidden,
  label,
  explanation,
}: {
  action: (form: FormData) => Promise<void>;
  hidden?: Record<string, string>;
  label: string;
  explanation: string;
}) {
  const [typed, setTyped] = useState("");
  const id = `confirm-${label.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <form action={action} className="space-y-3 rounded-2xl border border-danger/30 bg-danger-soft p-4">
      {Object.entries(hidden ?? {}).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <p className="text-sm">{explanation}</p>
      <Field id={id} label={<>Type <strong>delete</strong> to confirm</>}>
        <TextInput id={id} name="confirm" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
      </Field>
      <Button type="submit" variant="danger" icon="trash" disabled={typed !== "delete"}>
        {label}
      </Button>
    </form>
  );
}
