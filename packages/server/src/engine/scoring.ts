/**
 * Pure win-condition + scoring logic (F12). Computed server-side at seek end.
 * Seekers win iff every hider was found; otherwise hiders win. Survivors score for
 * surviving, the seeker scores per find. Returns a new RoomState carrying the result.
 */
import {
  SCORE_HIDER_SURVIVE,
  SCORE_SEEKER_FIND,
  type Player,
  type RoomState,
  type RoundResult,
  type Vec2,
  type Winner,
} from '@blendquest/shared';

export function hiders(state: RoomState): Player[] {
  return Object.values(state.players).filter((p) => p.role === 'hider');
}

export function seeker(state: RoomState): Player | undefined {
  return Object.values(state.players).find((p) => p.role === 'seeker');
}

export function allHidersFound(state: RoomState): boolean {
  const hs = hiders(state);
  return hs.length > 0 && hs.every((h) => h.found);
}

/** Compute the round result + apply per-round score deltas to each player (immutably). */
export function computeResult(state: RoomState): RoomState {
  const hs = hiders(state);
  const foundCount = hs.filter((h) => h.found).length;
  const everyoneFound = hs.length > 0 && foundCount === hs.length;
  const winner: Winner = everyoneFound ? 'seekers' : 'hiders';

  const scoreDelta: Record<string, number> = {};
  for (const h of hs) {
    scoreDelta[h.id] = h.found ? 0 : SCORE_HIDER_SURVIVE;
  }
  const sk = seeker(state);
  if (sk) scoreDelta[sk.id] = foundCount * SCORE_SEEKER_FIND;

  const players: Record<string, Player> = {};
  const scores: Record<string, number> = {};
  const positions: Record<string, Vec2> = {};
  for (const [id, p] of Object.entries(state.players)) {
    const newScore = p.score + (scoreDelta[id] ?? 0);
    players[id] = { ...p, score: newScore };
    scores[id] = newScore;
    positions[id] = p.pos;
  }

  const result: RoundResult = {
    round: state.round,
    winner,
    scores,
    positions,
    foundIds: hs.filter((h) => h.found).map((h) => h.id),
  };

  return { ...state, players, lastResult: result };
}
