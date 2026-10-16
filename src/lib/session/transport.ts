import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import type { SessionEvent } from "./events";

export interface SessionTransport {
  send(event: SessionEvent): void;
  subscribe(handler: (event: SessionEvent) => void): () => void;
  close(): void;
}

const EVENT = "sabaq";
const MAX_QUEUED = 200;

/**
 * Cross-device sync over Supabase Realtime Broadcast (nothing is stored).
 * Events sent while the socket is down are queued and flushed on rejoin;
 * `onReconnect` lets the caller resync full state after a drop.
 */
export function createRealtimeTransport(
  roomCode: string,
  client: SupabaseClient,
  opts: { onReconnect?: () => void } = {},
): SessionTransport {
  const handlers = new Set<(e: SessionEvent) => void>();
  const queue: SessionEvent[] = [];
  let joined = false;
  let everJoined = false;
  let closed = false;

  const push = (channel: RealtimeChannel, event: SessionEvent) =>
    void channel.send({ type: "broadcast", event: EVENT, payload: event });

  const channel = client
    .channel(`room:${roomCode}`, { config: { broadcast: { self: false, ack: false } } })
    .on("broadcast", { event: EVENT }, ({ payload }) => handlers.forEach((h) => h(payload as SessionEvent)))
    .subscribe((state) => {
      if (closed) return;
      joined = state === "SUBSCRIBED";
      if (!joined) return;
      for (const e of queue.splice(0)) push(channel, e);
      if (everJoined) opts.onReconnect?.();
      everJoined = true;
    });

  return {
    send(event) {
      if (closed) return;
      if (joined) return push(channel, event);
      // Presence is only useful live; everything else is replayed on rejoin.
      if (event.type === "presence") return;
      if (queue.length >= MAX_QUEUED) queue.shift();
      queue.push(event);
    },
    subscribe(handler) {
      handlers.add(handler);
      return () => handlers.delete(handler);
    },
    close() {
      if (closed) return;
      closed = true;
      handlers.clear();
      void client.removeChannel(channel);
    },
  };
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
