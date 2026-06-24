/**
 * Pure room/state reducers (immutable). The engine never imports Socket.io.
 * Every function returns a NEW RoomState — no in-place mutation (F4 guardrail).
 */
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  ENVIRONMENT_IDS,
  MAX_PLAYERS,
  MIN_PLAYERS,
  PREP_SECONDS,
  ROLE_REVEAL_SECONDS,
  type EnvironmentId,
  type Player,
  type RoomState,
} from '@blendquest/shared';
import { assignRoles, rotateRoles, type PickIndex } from './roles.js';

/** Spread spawn points along a horizontal band so players don't perfectly overlap. */
export function spawnPosition(index: number, total: number): { x: number; y: number } {
  const safeTotal = Math.max(total, 1);
  const slot = (index + 0.5) / safeTotal;
  return {
    x: Math.round(BOARD_WIDTH * (0.15 + 0.7 * slot)),
    y: Math.round(BOARD_HEIGHT * 0.5),
  };
}

export function makePlayer(id: string, name: string, isHost: boolean, index = 0, total = 1): Player {
  return {
    id,
    name,
    role: null,
    pos: spawnPosition(index, total),
    rotation: 0,
    pose: 0,
    paintVersion: 0,
    found: false,
    connected: true,
    score: 0,
    isHost,
  };
}

export function createRoom(
  code: string,
  hostId: string,
  hostName: string,
  environmentId: EnvironmentId,
): RoomState {
  return {
    code,
    hostId,
    environmentId,
    phase: 'lobby',
    round: 0,
    phaseEndsAt: 0,
    players: { [hostId]: makePlayer(hostId, hostName, true) },
    lastResult: null,
  };
}

export function playerCount(state: RoomState): number {
  return Object.keys(state.players).length;
}

export function isFull(state: RoomState): boolean {
  return playerCount(state) >= MAX_PLAYERS;
}

export function canStart(state: RoomState, requesterId: string): boolean {
  return (
    state.phase === 'lobby' &&
    requesterId === state.hostId &&
    playerCount(state) >= MIN_PLAYERS
  );
}

/** Add a player to a lobby. Caller must check `isFull` / phase first. */
export function addPlayer(state: RoomState, id: string, name: string): RoomState {
  if (state.players[id]) return state;
  const count = playerCount(state);
  const player = makePlayer(id, name, false, count, count + 1);
  return {
    ...state,
    players: { ...state.players, [id]: player },
  };
}

/**
 * Remove a player. If the host left, promote the earliest-joined remaining player.
 * Returns the new state; an empty room is signalled by `playerCount(next) === 0`.
 */
export function removePlayer(state: RoomState, id: string): RoomState {
  if (!state.players[id]) return state;
  const players: Record<string, Player> = {};
  for (const [pid, p] of Object.entries(state.players)) {
    if (pid !== id) players[pid] = p;
  }
  const remaining = Object.keys(players);
  if (remaining.length === 0) {
    return { ...state, players, hostId: '' };
  }
  let hostId = state.hostId;
  if (id === state.hostId) {
    hostId = remaining[0]!;
    players[hostId] = { ...players[hostId]!, isHost: true };
  }
  return { ...state, hostId, players };
}

/** Replace every player's role from a role map, immutably. */
function applyRoles(state: RoomState, roles: Record<string, Player['role']>): RoomState {
  const players: Record<string, Player> = {};
  for (const [id, p] of Object.entries(state.players)) {
    players[id] = { ...p, role: roles[id] ?? null };
  }
  return { ...state, players };
}

/**
 * Host starts the game (F2/F3): assign roles and enter the role-reveal phase.
 * The reveal auto-advances to prep via `beginPrep` (driven by the room timer / Phase 2 tick).
 */
export function startGame(state: RoomState, nowMs: number, pick: PickIndex): RoomState {
  const ids = Object.keys(state.players);
  const roles = assignRoles(ids, pick);
  const withRoles = applyRoles(state, roles);
  return {
    ...withRoles,
    phase: 'role_reveal',
    round: 1,
    phaseEndsAt: nowMs + ROLE_REVEAL_SECONDS * 1000,
  };
}

/** Begin a new round's roles by rotation (used when looping rounds — Phase 5). */
export function startNextRound(state: RoomState, nowMs: number): RoomState {
  const ids = Object.keys(state.players);
  const prevSeeker = ids.find((id) => state.players[id]!.role === 'seeker') ?? null;
  const roles = rotateRoles(ids, prevSeeker);
  const reset = resetPlayersForRound(applyRoles(state, roles));
  return {
    ...reset,
    environmentId: nextEnvironment(state.environmentId),
    phase: 'role_reveal',
    round: state.round + 1,
    phaseEndsAt: nowMs + ROLE_REVEAL_SECONDS * 1000,
    lastResult: null,
  };
}

/** Cycle to the next environment so successive rounds vary (consistent across clients). */
export function nextEnvironment(current: EnvironmentId): EnvironmentId {
  const idx = ENVIRONMENT_IDS.indexOf(current);
  return ENVIRONMENT_IDS[(idx + 1) % ENVIRONMENT_IDS.length]!;
}

/** Clear per-round player flags (found, paint) while keeping cumulative score. */
export function resetPlayersForRound(state: RoomState): RoomState {
  const players: Record<string, Player> = {};
  const ids = Object.keys(state.players);
  ids.forEach((id, i) => {
    const p = state.players[id]!;
    players[id] = {
      ...p,
      found: false,
      pos: spawnPosition(i, ids.length),
      rotation: 0,
      pose: 0,
    };
  });
  return { ...state, players };
}

/** Enter the prep phase (paint + position). */
export function beginPrep(state: RoomState, nowMs: number): RoomState {
  return {
    ...state,
    phase: 'prep',
    phaseEndsAt: nowMs + PREP_SECONDS * 1000,
  };
}

/** Update a player's position + rotation immutably (caller has already clamped the move). */
export function setPlayerPosition(
  state: RoomState,
  id: string,
  pos: { x: number; y: number },
  rotation: number,
): RoomState {
  const player = state.players[id];
  if (!player) return state;
  return {
    ...state,
    players: { ...state.players, [id]: { ...player, pos, rotation } },
  };
}

/** Set a player's preset pose (prep only — caller phase-gates). */
export function setPlayerPose(state: RoomState, id: string, pose: number): RoomState {
  const player = state.players[id];
  if (!player) return state;
  return {
    ...state,
    players: { ...state.players, [id]: { ...player, pose } },
  };
}

/** Mark a player as found/revealed (Phase 5 paintball hit). */
export function markFound(state: RoomState, id: string): RoomState {
  const player = state.players[id];
  if (!player || player.found) return state;
  return {
    ...state,
    players: { ...state.players, [id]: { ...player, found: true } },
  };
}

/** Record a committed paint blob version bump (Phase 3). */
export function bumpPaintVersion(state: RoomState, id: string, version: number): RoomState {
  const player = state.players[id];
  if (!player) return state;
  return {
    ...state,
    players: { ...state.players, [id]: { ...player, paintVersion: version } },
  };
}
