"use client";

import { useIsClient } from "@/lib/session/use-live-session";
import { LiveSession, type ForcedSessionState } from "./LiveSession";
import { PageSkeleton } from "./parts";
import type { SessionRole } from "@/lib/session/events";

export function SessionLoading() {
  return (
    <div className="flex h-dvh flex-col">
      <div className="h-14 border-b border-border bg-surface" />
      <div className="flex-1 p-4">
        <div className="mx-auto max-w-4xl">
          <PageSkeleton />
        </div>
      </div>
    </div>
  );
}

/** The live session reads device storage and opens a channel, so it renders client-only. */
export function SessionClient(props: {
  code: string;
  role: SessionRole;
  startPage?: number;
  latencyMs?: number;
  forced?: ForcedSessionState;
}) {
  const isClient = useIsClient();
  return isClient ? <LiveSession {...props} /> : <SessionLoading />;
}
