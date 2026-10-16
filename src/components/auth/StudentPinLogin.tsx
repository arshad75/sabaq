"use client";

import { useActionState, useState } from "react";
import { studentPinLogIn, type PinState } from "@/lib/auth/actions";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Banner } from "@/components/ui/States";
import { cn } from "@/lib/cn";

const PIN_LENGTH = 4;
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"];

export function StudentPinLogin({ students }: { students: { id: string; nickname: string }[] }) {
  const [chosen, setChosen] = useState<{ id: string; nickname: string } | null>(
    students.length === 1 ? students[0] : null,
  );

  if (!chosen) {
    return (
      <div>
        <h2 className="mb-4 text-center text-2xl font-semibold">Who is reading?</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {students.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => setChosen(s)}
                className="flex min-h-20 w-full items-center gap-4 rounded-2xl border border-border bg-surface px-5 text-left text-xl font-semibold hover:bg-surface-2"
              >
                <span aria-hidden className="grid size-12 place-items-center rounded-full bg-primary-soft text-primary">
                  {s.nickname.slice(0, 1)}
                </span>
                {s.nickname}
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // Keyed so switching child resets the pad and any error.
  return <PinPad key={chosen.id} student={chosen} onBack={students.length > 1 ? () => setChosen(null) : undefined} />;
}

function PinPad({ student, onBack }: { student: { id: string; nickname: string }; onBack?: () => void }) {
  const [state, formAction, pending] = useActionState<PinState, FormData>(studentPinLogIn, { status: "idle" });
  const [pin, setPin] = useState("");
  const locked = state.status === "locked";

  const press = (key: string, form: HTMLFormElement | null) => {
    if (locked || pending) return;
    if (key === "back") return setPin((p) => p.slice(0, -1));
    const next = (pin + key).slice(0, PIN_LENGTH);
    setPin(next);
    if (next.length === PIN_LENGTH) {
      // Submit after React has rendered the full PIN into the hidden input.
      requestAnimationFrame(() => {
        form?.requestSubmit();
        setPin("");
      });
    }
  };

  return (
    <form action={formAction} className="mx-auto max-w-xs text-center">
      <input type="hidden" name="studentId" value={student.id} />
      <input type="hidden" name="pin" value={pin} />
      <h2 className="text-2xl font-semibold">Hello, {student.nickname}!</h2>
      <p className="mt-1 text-muted">Type your secret number.</p>

      <div className="my-6 flex justify-center gap-3" role="status" aria-label={`${pin.length} of ${PIN_LENGTH} digits entered`}>
        {Array.from({ length: PIN_LENGTH }, (_, i) => (
          <span
            key={i}
            aria-hidden
            className={cn("size-5 rounded-full border-2 border-primary", i < pin.length && "bg-primary")}
          />
        ))}
      </div>

      {state.message && (
        <Banner tone={locked ? "warning" : "danger"} className="mb-4 text-left">
          {state.message}
        </Banner>
      )}

      <div className="grid grid-cols-3 gap-3">
        {KEYS.map((k, i) =>
          k === "" ? (
            <span key={i} />
          ) : (
            <button
              key={i}
              type="button"
              disabled={locked || pending}
              aria-label={k === "back" ? "Delete last digit" : k}
              onClick={(e) => press(k, e.currentTarget.form)}
              className="grid min-h-16 place-items-center rounded-2xl border border-border bg-surface text-2xl font-semibold hover:bg-surface-2 active:bg-primary-soft disabled:opacity-40"
            >
              {k === "back" ? <Icon name="chevronLeft" size={26} /> : k}
            </button>
          ),
        )}
      </div>

      {onBack && (
        <Button variant="ghost" className="mt-6" onClick={onBack}>
          Not {student.nickname}?
        </Button>
      )}
    </form>
  );
}
