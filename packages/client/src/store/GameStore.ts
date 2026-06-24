/**
 * Local mirror of the server snapshot (TECH_DESIGN §5.6). Scenes and UI subscribe here
 * and never hold their own copy of game truth. A one-time clock-offset (from serverNow on
 * each authoritative event) keeps countdowns honest without trusting the client clock (F5).
 */
import {
  ServerEvent,
  type ErrorPayload,
  type PhaseChangedPayload,
  type PlayersDeltaPayload,
  type RoomJoinedPayload,
  type RoomState,
} from '@blendquest/shared';
import type { NetClient } from '../net/NetClient.js';

export interface ClientState {
  connected: boolean;
  youId: string;
  room: RoomState | null;
  error: ErrorPayload | null;
  clockOffsetMs: number;
}

export type Listener = (state: ClientState) => void;

const initial: ClientState = {
  connected: false,
  youId: '',
  room: null,
  error: null,
  clockOffsetMs: 0,
};

export class GameStore {
  private state: ClientState = initial;
  private readonly listeners = new Set<Listener>();

  constructor(private readonly net: NetClient) {
    this.wire();
  }

  getState(): ClientState {
    return this.state;
  }

  get you() {
    const { room, youId } = this.state;
    return room ? (room.players[youId] ?? null) : null;
  }

  /** Server epoch ms estimate, corrected by the last observed offset. */
  serverNow(): number {
    return Date.now() + this.state.clockOffsetMs;
  }

  /** Remaining ms in the current phase (never negative). */
  phaseRemainingMs(): number {
    const { room } = this.state;
    if (!room || room.phaseEndsAt <= 0) return 0;
    return Math.max(0, room.phaseEndsAt - this.serverNow());
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private set(patch: Partial<ClientState>): void {
    this.state = { ...this.state, ...patch };
    for (const l of this.listeners) l(this.state);
  }

  private syncOffset(serverNow: number): void {
    this.set({ clockOffsetMs: serverNow - Date.now() });
  }

  private wire(): void {
    this.net.onConnect(() => this.set({ connected: true, youId: this.net.id }));
    this.net.onDisconnect(() => this.set({ connected: false }));

    this.net.socket.on(ServerEvent.RoomJoined, (p: RoomJoinedPayload) => {
      this.syncOffset(p.serverNow);
      this.set({ youId: p.youId, room: p.snapshot, error: null });
    });

    this.net.socket.on(ServerEvent.Snapshot, (room: RoomState) => {
      this.set({ room });
    });

    this.net.socket.on(ServerEvent.PhaseChanged, (p: PhaseChangedPayload) => {
      this.syncOffset(p.serverNow);
      const { room } = this.state;
      if (room) {
        this.set({ room: { ...room, phase: p.phase, phaseEndsAt: p.phaseEndsAt, round: p.round } });
      }
    });

    this.net.socket.on(ServerEvent.PlayersDelta, (p: PlayersDeltaPayload) => {
      const room = this.state.room;
      if (!room) return;
      const players = { ...room.players };
      for (const d of p.deltas) {
        const existing = players[d.id];
        if (existing) players[d.id] = { ...existing, pos: d.pos, rotation: d.rotation };
      }
      // Mutate-free update; the scene reads these as the latest authoritative positions.
      this.set({ room: { ...room, players } });
    });

    this.net.socket.on(ServerEvent.ErrorMsg, (e: ErrorPayload) => {
      this.set({ error: e });
    });
  }
}
