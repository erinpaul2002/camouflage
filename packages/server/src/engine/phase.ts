/**
 * The authoritative phase state machine (F4/F5). Driven purely by the server clock via
 * `advance(state, now)` — clients only observe. Loop:
 *   role_reveal → prep → seek → round_end → (rotate roles) role_reveal → …
 * Seek also ends early the moment every hider has been found (F12).
 */
import { ROUND_END_SECONDS, SEEK_SECONDS, type RoomState } from '@blendquest/shared';
import { beginPrep, startNextRound } from './room.js';
import { allHidersFound, computeResult } from './scoring.js';

export function beginSeek(state: RoomState, nowMs: number): RoomState {
  return { ...state, phase: 'seek', phaseEndsAt: nowMs + SEEK_SECONDS * 1000 };
}

export function beginRoundEnd(state: RoomState, nowMs: number): RoomState {
  const scored = computeResult(state);
  return { ...scored, phase: 'round_end', phaseEndsAt: nowMs + ROUND_END_SECONDS * 1000 };
}

export interface AdvanceResult {
  state: RoomState;
  changed: boolean;
}

/** Advance the phase if its timer expired (or seek's early-win fires). Pure. */
export function advance(state: RoomState, nowMs: number): AdvanceResult {
  const expired = state.phaseEndsAt > 0 && nowMs >= state.phaseEndsAt;
  switch (state.phase) {
    case 'role_reveal':
      if (expired) return { state: beginPrep(state, nowMs), changed: true };
      break;
    case 'prep':
      if (expired) return { state: beginSeek(state, nowMs), changed: true };
      break;
    case 'seek':
      if (expired || allHidersFound(state)) return { state: beginRoundEnd(state, nowMs), changed: true };
      break;
    case 'round_end':
      if (expired) return { state: startNextRound(state, nowMs), changed: true };
      break;
    default:
      break;
  }
  return { state, changed: false };
}
