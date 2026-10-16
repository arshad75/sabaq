"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Field, SegmentedControl, Switch, TextInput } from "@/components/ui/Form";
import { Badge } from "@/components/ui/Card";
import { Banner } from "@/components/ui/States";
import type { LoginMethod } from "@/lib/domain/types";
import { makeStudentLink, resetPin, setUpTablet } from "@/lib/auth/actions";

export function AddChildForm() {
  const [open, setOpen] = useState(false);
  const [nickname, setNickname] = useState("");
  const [method, setMethod] = useState<LoginMethod>("pin");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  if (!open) {
    return (
      <Button icon="plus" onClick={() => setOpen(true)}>
        Add child
      </Button>
    );
  }
  return (
    <form
      className="w-full space-y-4 rounded-2xl border border-border bg-surface p-4"
      onSubmit={(e) => {
        e.preventDefault();
        const name = nickname.trim();
        if (!name || name.length > 30) {
          setError("Enter a first name or nickname (up to 30 characters).");
          return;
        }
        setError(null);
        setDone(`${name} added. Set up their ${method === "pin" ? "PIN" : "magic link"} on their profile.`);
        setNickname("");
      }}
    >
      <Field
        id="child-nickname"
        label="First name or nickname"
        hint="That’s all we need. No surname, birthday, or photo."
        error={error}
      >
        <TextInput
          id="child-nickname"
          value={nickname}
          maxLength={30}
          autoComplete="off"
          onChange={(e) => setNickname(e.target.value)}
          aria-invalid={error ? true : undefined}
        />
      </Field>
      <SegmentedControl<LoginMethod>
        name="login-method"
        label="How will they sign in on the tablet?"
        value={method}
        onChange={setMethod}
        options={[
          { value: "pin", label: "PIN" },
          { value: "magic_link", label: "Magic link" },
        ]}
      />
      <div className="flex gap-2">
        <Button type="submit">Add child</Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
      {done && <Banner tone="success">{done}</Banner>}
    </form>
  );
}

export function LinkTeacherForm() {
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState("");
  const [msg, setMsg] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  if (!open) {
    return (
      <Button variant="secondary" icon="link" onClick={() => setOpen(true)}>
        Link a teacher
      </Button>
    );
  }
  return (
    <form
      className="w-full space-y-3 rounded-2xl border border-border bg-surface p-4"
      onSubmit={(e) => {
        e.preventDefault();
        setMsg(
          /\/invite\/[\w-]+\/[\w-]+/.test(link)
            ? { tone: "success", text: "Invite found. Choose which child to link, then approve below." }
            : { tone: "danger", text: "That doesn’t look like an invite link. Ask the teacher to send it again." },
        );
      }}
    >
      <Field id="invite-link" label="Teacher’s invite link">
        <TextInput id="invite-link" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…/invite/…" />
      </Field>
      <div className="flex gap-2">
        <Button type="submit">Check link</Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
      {msg && <Banner tone={msg.tone}>{msg.text}</Banner>}
    </form>
  );
}

export function ExportButton({ json, filename }: { json: string; filename: string }) {
  return (
    <Button
      variant="secondary"
      icon="download"
      onClick={() => {
        const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      }}
    >
      Export data
    </Button>
  );
}

export function ApprovalActions({ teacherName }: { teacherName: string }) {
  const [state, setState] = useState<"pending" | "approved" | "declined">("pending");
  if (state !== "pending") {
    return (
      <Badge tone={state === "approved" ? "success" : "neutral"} icon={state === "approved" ? "check" : "x"}>
        {state === "approved" ? `Approved` : "Declined"}
      </Badge>
    );
  }
  return (
    <div className="flex gap-2">
      <Button onClick={() => setState("approved")} aria-label={`Approve ${teacherName}`}>
        Approve
      </Button>
      <Button variant="ghost" onClick={() => setState("declined")} aria-label={`Decline ${teacherName}`}>
        Decline
      </Button>
    </div>
  );
}

export function RevokeButton({ teacherName }: { teacherName: string }) {
  const [confirm, setConfirm] = useState(false);
  const [revoked, setRevoked] = useState(false);
  if (revoked) return <Badge icon="x">Access removed</Badge>;
  if (!confirm) {
    return (
      <Button variant="ghost" onClick={() => setConfirm(true)}>
        Remove access
      </Button>
    );
  }
  return (
    <div className="flex gap-2" role="group" aria-label={`Confirm removing ${teacherName}`}>
      <Button variant="danger" onClick={() => setRevoked(true)}>
        Remove
      </Button>
      <Button variant="ghost" onClick={() => setConfirm(false)}>
        Cancel
      </Button>
    </div>
  );
}

export function RecordingConsent({ initial }: { initial: boolean }) {
  const [on, setOn] = useState(initial);
  return (
    <div>
      <Switch
        id="recording-consent"
        label="Allow recitation recordings"
        description="Off by default. When on, a teacher may record a short recitation. Recordings are deleted after 30 days, or sooner if you ask."
        checked={on}
        onChange={setOn}
      />
      {on && (
        <Banner tone="info" className="mt-2">
          Recording is allowed. You can turn this off at any time and existing recordings will be deleted.
        </Banner>
      )}
    </div>
  );
}

export function LoginSetup({
  studentId,
  method,
  nickname,
}: {
  studentId: string;
  method: LoginMethod;
  nickname: string;
}) {
  const [pin, setPin] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const errorBanner = error && <Banner tone="danger">{error}</Banner>;

  if (method === "pin") {
    return (
      <div className="space-y-3">
        <p className="text-muted">
          {nickname} signs in on the tablet with a 4-digit PIN. We only store a hashed version.
        </p>
        {pin && (
          <Banner tone="success" icon="key">
            New PIN: <strong className="font-mono text-xl tracking-[0.3em]">{pin}</strong>. Write it down; it won’t be
            shown again.
          </Banner>
        )}
        {errorBanner}
        <Button
          variant="secondary"
          icon="key"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const r = await resetPin(studentId);
              setError(r.ok ? null : r.message);
              setPin(r.ok ? r.value : null);
            })
          }
        >
          {pin ? "Make another PIN" : "Reset PIN"}
        </Button>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <p className="text-muted">Open a one-time link on {nickname}’s tablet to sign them in. Links expire after 15 minutes.</p>
      {link && <p className="rounded-xl bg-surface-2 p-3 font-mono text-sm break-all">{link}</p>}
      {errorBanner}
      <Button
        variant="secondary"
        icon="link"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const r = await makeStudentLink(studentId);
            setError(r.ok ? null : r.message);
            setLink(r.ok ? `${window.location.origin}${r.value.path}` : null);
          })
        }
      >
        {link ? "Make a new link" : "Create sign-in link"}
      </Button>
    </div>
  );
}

export function TabletSetup() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <div className="space-y-3">
      <p className="text-muted">
        Do this once on the tablet your child reads on. Afterwards the tablet shows a simple “Who is reading?” screen
        with a PIN pad.
      </p>
      {error && <Banner tone="danger">{error}</Banner>}
      <Button
        variant="secondary"
        icon="lock"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const r = await setUpTablet();
            if (!r.ok) setError(r.message);
          })
        }
      >
        Set up this tablet
      </Button>
    </div>
  );
}

export function DeleteChildData({ nickname }: { nickname: string }) {
  const [typed, setTyped] = useState("");
  const [deleted, setDeleted] = useState(false);
  if (deleted) {
    return <Banner tone="success">In the real app, all of {nickname}’s data would now be permanently deleted.</Banner>;
  }
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (typed.trim() === nickname) setDeleted(true);
      }}
    >
      <p>
        This removes {nickname}’s profile, sessions, marks, progress, assignments and any recordings. Teachers lose access
        straight away. This cannot be undone.
      </p>
      <Field id="confirm-delete" label={`Type ${nickname} to confirm`}>
        <TextInput id="confirm-delete" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
      </Field>
      <Button type="submit" variant="danger" icon="trash" disabled={typed.trim() !== nickname}>
        Delete all of {nickname}’s data
      </Button>
    </form>
  );
}
