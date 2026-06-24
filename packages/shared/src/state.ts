/**
 * Canonical game-state shapes (TECH_DESIGN §6). Both client and server import these.
 * All engine transitions return NEW objects — never mutate these in place.
 */
import type { EnvironmentId } from './constants.js';

export type Phase = 'lobby' | 'role_reveal' | 'prep' | 'seek' | 'round_end';
export type Role = 'hider' | 'seeker';

export interface Vec2 {
  x: number;
  y: number;
}

export interface Player {
  id: string; // socket id
  name: string;
  role: Role | null; // null in lobby
  pos: Vec2;
  rotation: number;
  pose: number; // preset pose index [0, POSE_COUNT)
  paintVersion: number; // bumps when paint committed (texture-sync cache key)
  found: boolean; // revealed by a seeker this round
  connected: boolean;
  score: number;
  isHost: boolean;
}

export interface RoomState {
  code: string;
  hostId: string;
  environmentId: EnvironmentId;
  phase: Phase;
  round: number;
  /** Absolute server epoch ms when the current phase ends (0 in lobby). */
  phaseEndsAt: number;
  players: Record<string, Player>;
  /** Set at round end; cleared on the next prep. */
  lastResult: RoundResult | null;
}

export type Winner = 'hiders' | 'seekers';

export interface RoundResult {
  round: number;
  winner: Winner;
  scores: Record<string, number>; // playerId -> cumulative score
  positions: Record<string, Vec2>; // playerId -> final position (reveal)
  foundIds: string[];
}

/** A snapshot is just the serializable RoomState broadcast to clients. */
export type Snapshot = RoomState;
