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
  const channel = new BroadcastChannel(`sabaq:room:${roomCode}`);
  const handlers = new Set<(e: SessionEvent) => void>();
  const latency = Math.max(0, opts.latencyMs ?? 0);
  const pending = new Map<ReturnType<typeof setTimeout>, SessionEvent>();
  let closed = false;

  channel.onmessage = (msg: MessageEvent<SessionEvent>) => handlers.forEach((h) => h(msg.data));

  return {
    send(event) {
      if (closed) return;
      if (!latency) return channel.postMessage(event);
      const timer = setTimeout(() => {
        pending.delete(timer);
        channel.postMessage(event);
      }, latency);
      pending.set(timer, event);
    },
    subscribe(handler) {
      handlers.add(handler);
      return () => handlers.delete(handler);
    },
    close() {
      if (closed) return;
      // Flush delayed sends so the last "left" presence still reaches the peer.
      for (const [timer, event] of pending) {
        clearTimeout(timer);
        channel.postMessage(event);
      }
      pending.clear();
      closed = true;
      handlers.clear();
      channel.close();
    },
  };
}
