import type { Metadata } from "next";
import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { FullScreenMessage } from "@/components/session/parts";
import { SessionClient, SessionLoading } from "@/components/session/SessionClient";
import type { ForcedSessionState } from "@/components/session/LiveSession";
import { previewEnabled } from "@/lib/preview";
import { clampBookPage, parseBook } from "@/lib/books";
import { isValidRoomCode, normaliseRoomCode } from "@/lib/session/room-code";
import type { SessionRole } from "@/lib/session/events";

export const metadata: Metadata = { title: "Live session" };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default function Page(props: PageProps<"/session/[code]">) {
  return (
    <Suspense fallback={<SessionLoading />}>
      <SessionRoute {...props} />
    </Suspense>
  );
}

async function SessionRoute({ params, searchParams }: PageProps<"/session/[code]">) {
  const [{ code: raw }, sp] = await Promise.all([params, searchParams]);
  const code = normaliseRoomCode(raw);
  const state = previewEnabled ? one(sp.state) : undefined;

  if (state === "loading") return <SessionLoading />;

  if (state === "invalid" || !isValidRoomCode(code)) {
    return (
      <FullScreenMessage title="That code doesn’t work" tone="danger">
        <p>Room codes are 6 letters and numbers, like K7M2QX. Check the code with your teacher.</p>
        <ButtonLink href="/join" size="lg" className="w-full">
          Try another code
        </ButtonLink>
      </FullScreenMessage>
    );
  }

  if (state === "expired") {
    return (
      <FullScreenMessage title="This session has expired" tone="danger">
        <p>Sessions close after a period with no activity. Ask your teacher for a new code.</p>
        <ButtonLink href="/join" size="lg" className="w-full">
          Enter a new code
        </ButtonLink>
      </FullScreenMessage>
    );
  }

  const book = parseBook(one(sp.book));
  const bookQs = book ? `&book=${book}` : "";
  const roleParam = one(sp.role);
  const role: SessionRole | null = roleParam === "teacher" || roleParam === "student" ? roleParam : null;
  if (!role) {
    return (
      <FullScreenMessage title={`Join room ${code}`}>
        <p>Who is joining on this device?</p>
        <div className="grid gap-3">
          <ButtonLink href={`/session/${code}?role=student${bookQs}`} size="lg" icon="book">
            I’m the student
          </ButtonLink>
          <ButtonLink href={`/session/${code}?role=teacher${bookQs}`} size="lg" variant="secondary" icon="users">
            I’m the teacher
          </ButtonLink>
        </div>
      </FullScreenMessage>
    );
  }

  const startPage = clampBookPage(book ?? "quran", Number(one(sp.page)) || 1);
  const latencyMs = previewEnabled ? Number(one(sp.latency)) || 0 : 0;
  const forced: ForcedSessionState =
    state === "waiting" || state === "reconnecting" || state === "ended" ? state : null;

  return (
    <SessionClient code={code} role={role} book={book} startPage={startPage} latencyMs={latencyMs} forced={forced} />
  );
}
