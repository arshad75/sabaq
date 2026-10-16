"use client";

import Link from "next/link";
import { startTransition, useActionState, useState, useSyncExternalStore } from "react";
import {
  requestLesson,
  requestPasswordReset,
  setNewPassword,
  signUp,
  type FormState,
} from "@/lib/auth/account-actions";
import { BOOK_LABEL } from "@/lib/books";
import { BOOKS, type Book } from "@/lib/domain/types";
import { generateRoomCode } from "@/lib/session/room-code";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Field, SegmentedControl, TextArea, TextInput } from "@/components/ui/Form";
import { Banner } from "@/components/ui/States";

const IDLE: FormState = { status: "idle" };
const link = "font-medium text-primary underline-offset-4 hover:underline";

/** Submit without `action=` so React doesn't clear what the person typed when there's an error. */
function useForm(action: (prev: FormState, form: FormData) => Promise<FormState>) {
  const [state, run, pending] = useActionState(action, IDLE);
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => run(data));
  };
  return { state, pending, onSubmit };
}

export function AccountSignupForm() {
  const { state, pending, onSubmit } = useForm(signUp);

  if (state.status === "sent") {
    return (
      <Banner tone="success" icon="check">
        <p className="font-medium">Check your email</p>
        <p className="text-sm">We sent a link to {state.email} to finish creating your account.</p>
      </Banner>
    );
  }

  return (
    <form noValidate className="space-y-5" onSubmit={onSubmit}>
      <Field id="name" label="Your first name">
        <TextInput id="name" name="name" autoComplete="given-name" maxLength={40} required />
      </Field>
      <Field id="email" label="Email">
        <TextInput id="email" name="email" type="email" autoComplete="email" defaultValue={state.email} required />
      </Field>
      <Field id="password" label="Password" hint="At least 8 characters.">
        <TextInput id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      {state.status === "error" && <Banner tone="danger">{state.message}</Banner>}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Creating your account…" : "Create account"}
      </Button>
      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className={link}>
          Log in
        </Link>
      </p>
      <p className="text-center text-sm text-muted">
        Teaching with Sabaq? Sign up the same way, and we’ll switch your account to a teacher account.
      </p>
    </form>
  );
}

export function ResetRequestForm() {
  const { state, pending, onSubmit } = useForm(requestPasswordReset);

  if (state.status === "sent") {
    return (
      <Banner tone="success" icon="check">
        <p className="font-medium">Check your email</p>
        <p className="text-sm">
          If {state.email} has an account, a link to choose a new password is on its way. Check your spam folder if it
          doesn’t arrive in a few minutes.
        </p>
      </Banner>
    );
  }

  return (
    <form noValidate className="space-y-5" onSubmit={onSubmit}>
      <Field id="email" label="Email">
        <TextInput id="email" name="email" type="email" autoComplete="email" defaultValue={state.email} required />
      </Field>
      {state.status === "error" && <Banner tone="danger">{state.message}</Banner>}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Sending…" : "Email me a reset link"}
      </Button>
      <p className="text-center text-sm text-muted">
        Remembered it?{" "}
        <Link href="/login" className={link}>
          Log in
        </Link>
      </p>
    </form>
  );
}

export function NewPasswordForm() {
  const { state, pending, onSubmit } = useForm(setNewPassword);
  return (
    <form noValidate className="space-y-5" onSubmit={onSubmit}>
      <Field id="password" label="New password" hint="At least 8 characters.">
        <TextInput id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      {state.status === "error" && <Banner tone="danger">{state.message}</Banner>}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Saving…" : "Save new password"}
      </Button>
    </form>
  );
}

const noop = () => () => {};
const browserTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

export function LessonRequestForm() {
  const { state, pending, onSubmit } = useForm(requestLesson);
  const [book, setBook] = useState<Book>("qaida");
  const timezone = useSyncExternalStore(noop, browserTimeZone, () => "");

  return (
    <form noValidate className="space-y-5" onSubmit={onSubmit}>
      <Field id="child" label="Your child’s first name or nickname" hint="Just a name. We don’t ask for ages or photos.">
        <TextInput id="child" name="child" maxLength={40} autoComplete="off" required />
      </Field>
      <SegmentedControl<Book>
        name="book"
        label="What would they like to read?"
        value={book}
        onChange={setBook}
        options={BOOKS.map((b) => ({ value: b, label: BOOK_LABEL[b] })).reverse()}
      />
      <Field
        id="times"
        label="Which days and times suit you?"
        hint={timezone ? `In your time zone (${timezone}).` : "In your time zone."}
      >
        <TextInput id="times" name="times" maxLength={200} placeholder="e.g. weekday evenings after 6pm" required />
      </Field>
      <input type="hidden" name="timezone" value={timezone} />
      <Field id="note" label="Anything else we should know? (optional)">
        <TextArea id="note" name="note" maxLength={300} placeholder="e.g. has started the Qaida before" />
      </Field>
      {state.status === "error" && <Banner tone="danger">{state.message}</Banner>}
      <Button type="submit" size="lg" icon="calendar" className="w-full" disabled={pending}>
        {pending ? "Sending…" : "Ask for a first lesson"}
      </Button>
    </form>
  );
}

export function StartLiveLesson() {
  const [book, setBook] = useState<Book>("qaida");
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!code) {
    return (
      <div className="space-y-4">
        <SegmentedControl<Book>
          name="live-book"
          label="Book"
          value={book}
          onChange={setBook}
          options={BOOKS.map((b) => ({ value: b, label: BOOK_LABEL[b] })).reverse()}
        />
        <Button size="lg" icon="play" className="w-full" onClick={() => setCode(generateRoomCode())}>
          Start a live lesson
        </Button>
      </div>
    );
  }

  const studentLink = `${window.location.origin}/session/${code}?role=student&book=${book}`;
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-muted">Lesson code</p>
        <p className="font-mono text-4xl font-semibold tracking-[0.3em]" aria-live="polite">
          {code}
        </p>
      </div>
      <p className="text-sm text-muted">Read the code out on your call, or send the link to the family.</p>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          icon={copied ? "check" : "copy"}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(studentLink);
              setCopied(true);
            } catch {
              window.prompt("Copy this link", studentLink);
            }
          }}
        >
          {copied ? "Link copied" : "Copy link for the child"}
        </Button>
        <ButtonLink href={`/session/${code}?role=teacher&book=${book}`} icon="play">
          Open live view
        </ButtonLink>
      </div>
    </div>
  );
}
