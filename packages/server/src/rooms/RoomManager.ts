/**
 * RoomManager — owns the room registry (code → RoomState) and the socket→room map,
 * drives the authoritative phase machine via `tick`, validates+applies movement, and
 * broadcasts via an injected Transport. All game-state changes go through the pure engine
 * reducers (immutability preserved). Socket.io never appears here.
 */
import { randomInt } from 'node:crypto';
import {
  ENVIRONMENT_IDS,
  ErrorCode,
  MIN_PLAYERS,
  PAINTBALL_COLORS,
  PAINTBALL_COOLDOWN_MS,
  PAINTBALL_HIT_RADIUS,
  ServerEvent,
  TICK_HZ,
  type EnvironmentId,
  type RoomState,
  type Vec2,
} from '@blendquest/shared';
import {
  addPlayer,
  bumpPaintVersion,
  canStart,
  createRoom,
  isFull,
  markFound,
  playerCount,
  removePlayer,
  setPlayerPose,
  setPlayerPosition,
  startGame,
} from '../engine/room.js';
import { clampMove, maxSpeedFor } from '../engine/movement.js';
import { advance } from '../engine/phase.js';
import { findHit } from '../engine/combat.js';
import { generateUniqueCode } from './roomCode.js';
import type { Transport } from './transport.js';

export interface RoomManagerDeps {
  transport: Transport;
  now?: () => number;
  pick?: (n: number) => number;
}

export class RoomManager {
  private readonly rooms = new Map<string, RoomState>();
  private readonly socketRoom = new Map<string, string>();
  /** Per-room set of player ids whose position changed since the last delta broadcast. */
  private readonly dirty = new Map<string, Set<string>>();
  /** Per-socket timestamp of the last accepted move (anti-teleport timing). */
  private readonly lastMove = new Map<string, number>();
  /** Per-socket timestamp of the last paintball shot (cooldown enforcement, ADR-005). */
  private readonly lastFire = new Map<string, number>();
  /** Committed paint blobs per room: code → (playerId → {blob, version}). Replayed to late joiners. */
  private readonly paintBlobs = new Map<string, Map<string, { blob: string; version: number }>>();

  private readonly transport: Transport;
  private readonly now: () => number;
  private readonly pick: (n: number) => number;
  private interval: ReturnType<typeof setInterval> | null = null;

  constructor(deps: RoomManagerDeps) {
    this.transport = deps.transport;
    this.now = deps.now ?? Date.now;
    this.pick = deps.pick ?? randomInt;
  }

  getRoom(code: string): RoomState | undefined {
    return this.rooms.get(code);
  }

  roomCount(): number {
    return this.rooms.size;
  }

  /** Begin the authoritative tick loop (production). Tests call `tick` directly. */
  start(tickHz = TICK_HZ): void {
    if (this.interval) return;
    this.interval = setInterval(() => this.tick(this.now()), 1000 / tickHz);
    this.interval.unref?.();
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  // ── Intents ───────────────────────────────────────────────────────────────

  createRoom(socketId: string, name: string): void {
    if (this.socketRoom.has(socketId)) {
      return this.fail(socketId, ErrorCode.AlreadyInRoom, 'Already in a room');
    }
    const code = generateUniqueCode(new Set(this.rooms.keys()), this.pick);
    const state = createRoom(code, socketId, name, this.randomEnvironment());
    this.rooms.set(code, state);
    this.bindSocket(socketId, code);
    this.sendJoined(socketId, state);
    this.broadcastSnapshot(code);
  }

  /** Replay committed paint blobs to a freshly-joined socket so it sees current art (F9). */
  private replayPaint(socketId: string, code: string): void {
    const map = this.paintBlobs.get(code);
    if (!map) return;
    for (const [playerId, { blob, version }] of map) {
      this.transport.toSocket(socketId, ServerEvent.PaintUpdate, { playerId, blob, version });
    }
  }

  joinRoom(socketId: string, code: string, name: string): void {
    if (this.socketRoom.has(socketId)) {
      return this.fail(socketId, ErrorCode.AlreadyInRoom, 'Already in a room');
    }
    const state = this.rooms.get(code);
    if (!state) return this.fail(socketId, ErrorCode.RoomNotFound, 'Room not found');
    if (state.phase !== 'lobby') {
      return this.fail(socketId, ErrorCode.WrongPhase, 'Game already started');
    }
    if (isFull(state)) return this.fail(socketId, ErrorCode.RoomFull, 'Room is full');

    const next = addPlayer(state, socketId, name);
    this.rooms.set(code, next);
    this.bindSocket(socketId, code);
    this.sendJoined(socketId, next);
    this.replayPaint(socketId, code);
    this.broadcastSnapshot(code);
  }

  startGame(socketId: string): void {
    const code = this.socketRoom.get(socketId);
    if (!code) return this.fail(socketId, ErrorCode.RoomNotFound, 'Not in a room');
    const state = this.rooms.get(code);
    if (!state) return this.fail(socketId, ErrorCode.RoomNotFound, 'Room not found');
    if (socketId !== state.hostId) {
      return this.fail(socketId, ErrorCode.NotHost, 'Only the host can start');
    }
    if (playerCount(state) < MIN_PLAYERS) {
      return this.fail(socketId, ErrorCode.NotEnoughPlayers, `Need ${MIN_PLAYERS}+ players`);
    }
    if (!canStart(state, socketId)) {
      return this.fail(socketId, ErrorCode.WrongPhase, 'Cannot start now');
    }

    const reveal = startGame(state, this.now(), this.pick);
    this.rooms.set(code, reveal);
    this.emitPhase(code, reveal);
    this.broadcastSnapshot(code);
  }

  /** Movement intent — already zod-validated (bounds/finite) at the gateway. */
  move(socketId: string, pos: Vec2, rotation: number): void {
    const code = this.socketRoom.get(socketId);
    if (!code) return;
    const state = this.rooms.get(code);
    if (!state) return;
    if (state.phase !== 'prep' && state.phase !== 'seek') return;
    const player = state.players[socketId];
    if (!player) return;

    const now = this.now();
    // Default the first move's delta to one tick interval so it isn't clamped to zero.
    const last = this.lastMove.get(socketId) ?? now - 1000 / TICK_HZ;
    const dt = now - last;
    this.lastMove.set(socketId, now);
    const speed = maxSpeedFor(player.role, state.phase);
    const clamped = clampMove(player.pos, pos, speed, dt);

    this.rooms.set(code, setPlayerPosition(state, socketId, clamped, rotation));
    this.markDirty(code, socketId);
  }

  /**
   * Paint commit (F9) — store the player's painted blob, bump the server-owned paintVersion,
   * and fan out `paint_update` to the room. Hiders only; prep/seek phases. The blob size is
   * already capped at the gateway (F18); the server never trusts the client's version number.
   */
  paintCommit(socketId: string, blob: string, _clientVersion: number): void {
    const code = this.socketRoom.get(socketId);
    if (!code) return;
    const state = this.rooms.get(code);
    if (!state) return;
    if (state.phase !== 'prep' && state.phase !== 'seek') return;
    const player = state.players[socketId];
    if (!player || player.role === 'seeker') return;

    const version = player.paintVersion + 1;
    this.rooms.set(code, bumpPaintVersion(state, socketId, version));
    let map = this.paintBlobs.get(code);
    if (!map) {
      map = new Map();
      this.paintBlobs.set(code, map);
    }
    map.set(socketId, { blob, version });
    this.transport.toRoom(code, ServerEvent.PaintUpdate, { playerId: socketId, blob, version });
  }

  /**
   * Seeker fires a paintball (F11). Seek phase + seeker only, with a server-enforced cooldown
   * (ADR-005). Picks a random color, broadcasts the shot for animation, hit-tests against
   * authoritative positions, and reveals the closest hider in range.
   */
  firePaintball(socketId: string, targetPos: Vec2): void {
    const code = this.socketRoom.get(socketId);
    if (!code) return;
    const state = this.rooms.get(code);
    if (!state || state.phase !== 'seek') return;
    const player = state.players[socketId];
    if (!player || player.role !== 'seeker') return;

    const now = this.now();
    if (now - (this.lastFire.get(socketId) ?? -Infinity) < PAINTBALL_COOLDOWN_MS) return;
    this.lastFire.set(socketId, now);

    const color = PAINTBALL_COLORS[this.pick(PAINTBALL_COLORS.length)] ?? PAINTBALL_COLORS[0];
    this.transport.toRoom(code, ServerEvent.PaintballFired, { byId: socketId, targetPos, color });

    const hitId = findHit(state, targetPos, PAINTBALL_HIT_RADIUS);
    if (hitId) {
      this.rooms.set(code, markFound(state, hitId));
      this.transport.toRoom(code, ServerEvent.PlayerFound, { targetId: hitId, byId: socketId });
      this.broadcastSnapshot(code);
    }
  }

  /** Pose intent (prep only) — low-frequency, broadcast as a snapshot. */
  setPose(socketId: string, pose: number): void {
    const code = this.socketRoom.get(socketId);
    if (!code) return;
    const state = this.rooms.get(code);
    if (!state || state.phase !== 'prep') return;
    if (!state.players[socketId]) return;
    this.rooms.set(code, setPlayerPose(state, socketId, pose));
    this.broadcastSnapshot(code);
  }

  leave(socketId: string): void {
    const code = this.socketRoom.get(socketId);
    this.socketRoom.delete(socketId);
    this.lastMove.delete(socketId);
    this.lastFire.delete(socketId);
    if (!code) return;
    this.transport.leave(socketId, code);
    const state = this.rooms.get(code);
    if (!state) return;

    const next = removePlayer(state, socketId);
    this.dirty.get(code)?.delete(socketId);
    this.paintBlobs.get(code)?.delete(socketId);
    if (playerCount(next) === 0) {
      this.destroyRoom(code);
      return;
    }
    this.rooms.set(code, next);
    this.broadcastSnapshot(code);
  }

  // ── Authoritative tick ──────────────────────────────────────────────────────

  /** Advance every room's phase machine and flush position deltas. */
  tick(now: number): void {
    for (const [code, state] of this.rooms) {
      const adv = advance(state, now);
      if (adv.changed) {
        this.rooms.set(code, adv.state);
        this.dirty.get(code)?.clear();
        // New round begins at role_reveal — last round's paint is cleared.
        if (adv.state.phase === 'role_reveal') this.paintBlobs.get(code)?.clear();
        this.emitPhase(code, adv.state);
        this.broadcastSnapshot(code);
        continue;
      }
      if (state.phase === 'prep' || state.phase === 'seek') {
        this.flushDeltas(code, state, now);
      }
    }
  }

  private flushDeltas(code: string, state: RoomState, now: number): void {
    const set = this.dirty.get(code);
    if (!set || set.size === 0) return;
    const deltas = [...set]
      .map((id) => state.players[id])
      .filter((p): p is NonNullable<typeof p> => Boolean(p))
      .map((p) => ({ id: p.id, pos: p.pos, rotation: p.rotation }));
    set.clear();
    if (deltas.length > 0) {
      this.transport.toRoom(code, ServerEvent.PlayersDelta, { deltas, serverNow: now });
    }
  }

  // ── Internals ───────────────────────────────────────────────────────────────

  private markDirty(code: string, socketId: string): void {
    let set = this.dirty.get(code);
    if (!set) {
      set = new Set();
      this.dirty.set(code, set);
    }
    set.add(socketId);
  }

  private bindSocket(socketId: string, code: string): void {
    this.socketRoom.set(socketId, code);
    this.transport.join(socketId, code);
  }

  private sendJoined(socketId: string, state: RoomState): void {
    this.transport.toSocket(socketId, ServerEvent.RoomJoined, {
      snapshot: state,
      youId: socketId,
      serverNow: this.now(),
    });
  }

  private broadcastSnapshot(code: string): void {
    const state = this.rooms.get(code);
    if (state) this.transport.toRoom(code, ServerEvent.Snapshot, state);
  }

  private emitPhase(code: string, state: RoomState): void {
    this.transport.toRoom(code, ServerEvent.PhaseChanged, {
      phase: state.phase,
      phaseEndsAt: state.phaseEndsAt,
      round: state.round,
      serverNow: this.now(),
    });
  }

  private destroyRoom(code: string): void {
    this.rooms.delete(code);
    this.dirty.delete(code);
    this.paintBlobs.delete(code);
  }

  private randomEnvironment(): EnvironmentId {
    return ENVIRONMENT_IDS[this.pick(ENVIRONMENT_IDS.length)] ?? ENVIRONMENT_IDS[0];
  }

  private fail(socketId: string, code: string, message: string): void {
    this.transport.toSocket(socketId, ServerEvent.ErrorMsg, { code, message });
  }
}
