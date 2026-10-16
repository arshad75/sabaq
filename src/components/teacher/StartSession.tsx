"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { generateRoomCode } from "@/lib/session/room-code";
import { Button } from "@/components/ui/Button";
import { Field, Select } from "@/components/ui/Form";

export function StartSession({ students }: { students: { id: string; nickname: string }[] }) {
  const router = useRouter();
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (code) {
    const link = `${window.location.origin}/session/${code}?role=student`;
    return (
      <div className="space-y-4">
        <div>
          <p className="text-sm text-muted">Room code</p>
          <p className="font-mono text-4xl font-semibold tracking-[0.3em]" aria-live="polite">
            {code}
          </p>
        </div>
        <p className="text-sm text-muted">
          Read the code out on your call, or send the link to the guardian.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            icon={copied ? "check" : "copy"}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(link);
                setCopied(true);
              } catch {
                window.prompt("Copy this link", link);
              }
            }}
          >
            {copied ? "Link copied" : "Copy student link"}
          </Button>
          <Button icon="play" onClick={() => router.push(`/session/${code}?role=teacher`)}>
            Open live view
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setCode(generateRoomCode());
      }}
    >
      <Field id="start-student" label="Student">
        <Select id="start-student" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nickname}
            </option>
          ))}
        </Select>
      </Field>
      <Button type="submit" size="lg" icon="play" className="w-full" disabled={!studentId}>
        Start a session
      </Button>
    </form>
  );
}
