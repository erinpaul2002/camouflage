/**
 * The wire protocol (TECH_DESIGN §7). Client→Server are INTENTS (validated, untrusted);
 * Server→Client are AUTHORITATIVE state/events.
 *
 * Event-name string constants live here so client and server can't drift, plus the
 * typed payload maps used to type the Socket.io client/server in the net/ layers.
 */
import type { Phase, RoomState, Snapshot, Vec2, Winner } from './state.js';

// ── Event names ─────────────────────────────────────────────────────────────
export const ClientEvent = {
  CreateRoom: 'create_room',
  JoinRoom: 'join_room',
  StartGame: 'start_game',
  Move: 'move',
  SetPose: 'set_pose',
  PaintCommit: 'paint_commit',
  FirePaintball: 'fire_paintball',
  LeaveRoom: 'leave_room',
} as const;

export const ServerEvent = {
  RoomJoined: 'room_joined',
  Snapshot: 'snapshot',
  PlayersDelta: 'players_delta',
  PaintUpdate: 'paint_update',
  PhaseChanged: 'phase_changed',
  PaintballFired: 'paintball_fired',
  PlayerFound: 'player_found',
  RoundResult: 'round_result',
  ErrorMsg: 'error',
} as const;

// ── Client → Server payloads ────────────────────────────────────────────────
export interface CreateRoomPayload {
  name: string;
}
export interface JoinRoomPayload {
  code: string;
  name: string;
}
export type StartGamePayload = Record<string, never>;
export interface MovePayload {
  pos: Vec2;
  rotation: number;
}
export interface SetPosePayload {
  pose: number;
}
export interface PaintCommitPayload {
  /** base64 (data-URL body) PNG of the character canvas; size-capped server-side. */
  blob: string;
  version: number;
}
export interface FirePaintballPayload {
  targetPos: Vec2;
}
export type LeaveRoomPayload = Record<string, never>;

// ── Server → Client payloads ────────────────────────────────────────────────
export interface RoomJoinedPayload {
  snapshot: Snapshot;
  youId: string;
  /** server epoch ms at send time — client derives a clock offset for countdowns. */
  serverNow: number;
}
export interface PlayerDelta {
  id: string;
  pos: Vec2;
  rotation: number;
}
export interface PlayersDeltaPayload {
  deltas: PlayerDelta[];
  serverNow: number;
}
export interface PaintUpdatePayload {
  playerId: string;
  blob: string;
  version: number;
}
export interface PhaseChangedPayload {
  phase: Phase;
  phaseEndsAt: number;
  round: number;
  serverNow: number;
}
export interface PaintballFiredPayload {
  byId: string;
  targetPos: Vec2;
  color: string;
}
export interface PlayerFoundPayload {
  targetId: string;
  byId: string;
}
export interface RoundResultPayload {
  winner: Winner;
  scores: Record<string, number>;
  positions: Record<string, Vec2>;
  foundIds: string[];
  round: number;
}
export interface ErrorPayload {
  code: string;
  message: string;
}

// ── Socket.io typed event maps ──────────────────────────────────────────────
export interface ClientToServerEvents {
  [ClientEvent.CreateRoom]: (p: CreateRoomPayload) => void;
  [ClientEvent.JoinRoom]: (p: JoinRoomPayload) => void;
  [ClientEvent.StartGame]: (p: StartGamePayload) => void;
  [ClientEvent.Move]: (p: MovePayload) => void;
  [ClientEvent.SetPose]: (p: SetPosePayload) => void;
  [ClientEvent.PaintCommit]: (p: PaintCommitPayload) => void;
  [ClientEvent.FirePaintball]: (p: FirePaintballPayload) => void;
  [ClientEvent.LeaveRoom]: (p: LeaveRoomPayload) => void;
}

export interface ServerToClientEvents {
  [ServerEvent.RoomJoined]: (p: RoomJoinedPayload) => void;
  [ServerEvent.Snapshot]: (p: RoomState) => void;
  [ServerEvent.PlayersDelta]: (p: PlayersDeltaPayload) => void;
  [ServerEvent.PaintUpdate]: (p: PaintUpdatePayload) => void;
  [ServerEvent.PhaseChanged]: (p: PhaseChangedPayload) => void;
  [ServerEvent.PaintballFired]: (p: PaintballFiredPayload) => void;
  [ServerEvent.PlayerFound]: (p: PlayerFoundPayload) => void;
  [ServerEvent.RoundResult]: (p: RoundResultPayload) => void;
  [ServerEvent.ErrorMsg]: (p: ErrorPayload) => void;
}

/** Structured, non-leaky error codes. */
export const ErrorCode = {
  RoomNotFound: 'ROOM_NOT_FOUND',
  RoomFull: 'ROOM_FULL',
  InvalidPayload: 'INVALID_PAYLOAD',
  NotHost: 'NOT_HOST',
  NotEnoughPlayers: 'NOT_ENOUGH_PLAYERS',
  WrongPhase: 'WRONG_PHASE',
  NotSeeker: 'NOT_SEEKER',
  RateLimited: 'RATE_LIMITED',
  AlreadyInRoom: 'ALREADY_IN_ROOM',
  Internal: 'INTERNAL',
} as const;
export type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode];
