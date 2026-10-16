import type { SessionEvent } from "./events";

export interface SessionTransport {
  send(event: SessionEvent): void;
  subscribe(handler: (event: SessionEvent) => void): () => void;
  close(): void;
}

/**
 * Same-device stand-in for Supabase Realtime Broadcast: syncs tabs of one browser.
 * `latencyMs` delays each send (one-way) to approximate a long-distance connection.
 */
export function createLocalTransport(roomCode: string, opts: { latencyMs?: number } = {}): SessionTransport {
  const channel = new BroadcastChannel(`lesson-sync:room:${roomCode}`);
  const handlers = new Set<(e: SessionEvent) => void>();
  const latency = Math.max(0, opts.latencyMs ?? 0);

  channel.onmessage = (msg: MessageEvent<SessionEvent>) => handlers.forEach((h) => h(msg.data));

  return {
    send(event) {
      if (latency) setTimeout(() => channel.postMessage(event), latency);
      else channel.postMessage(event);
    },
    subscribe(handler) {
      handlers.add(handler);
      return () => handlers.delete(handler);
    },
    close() {
      handlers.clear();
      channel.close();
    },
  };
}
