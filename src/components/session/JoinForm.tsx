"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, SegmentedControl, TextInput } from "@/components/ui/Form";
import { isValidRoomCode, normaliseRoomCode, ROOM_CODE_LENGTH } from "@/lib/session/room-code";
import type { SessionRole } from "@/lib/session/events";

export function JoinForm({ initialCode = "", initialError }: { initialCode?: string; initialError?: string }) {
  const router = useRouter();
  const [code, setCode] = useState(normaliseRoomCode(initialCode).slice(0, ROOM_CODE_LENGTH));
  const [role, setRole] = useState<SessionRole>("student");
  const [error, setError] = useState<string | undefined>(initialError);
  const [pending, setPending] = useState(false);

  return (
    <form
      noValidate
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (!isValidRoomCode(code)) {
          setError(
            code.length < ROOM_CODE_LENGTH
              ? `The code has ${ROOM_CODE_LENGTH} characters.`
              : "That code doesn’t look right. Codes don’t use I, O, 0 or 1.",
          );
          return;
        }
        setPending(true);
        router.push(`/session/${code}?role=${role}`);
      }}
    >
      <Field id="room-code" label="Room code" hint="Your teacher will give you this code." error={error}>
        <TextInput
          id="room-code"
          name="code"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          inputMode="text"
          maxLength={ROOM_CODE_LENGTH}
          value={code}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "room-code-error" : "room-code-hint"}
          onChange={(e) => {
            setCode(normaliseRoomCode(e.target.value).slice(0, ROOM_CODE_LENGTH));
            setError(undefined);
          }}
          placeholder="K7M2QX"
          className="h-16 text-center font-mono text-3xl tracking-[0.4em] uppercase"
        />
      </Field>
      <SegmentedControl<SessionRole>
        name="role"
        label="I am the"
        value={role}
        onChange={setRole}
        options={[
          { value: "student", label: "Student" },
          { value: "teacher", label: "Teacher" },
        ]}
      />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Joining…" : "Join session"}
      </Button>
    </form>
  );
}
