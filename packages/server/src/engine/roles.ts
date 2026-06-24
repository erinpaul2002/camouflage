/**
 * Pure role assignment & rotation (F3). Exactly one seeker, everyone else hides.
 * RNG is injected so assignment is deterministic in tests.
 */
import type { Role } from '@blendquest/shared';

export type RoleMap = Record<string, Role>;

/** Pick an integer in [0, n). Default uses crypto in callers; tests inject a stub. */
export type PickIndex = (n: number) => number;

function buildMap(playerIds: readonly string[], seekerIdx: number): RoleMap {
  const map: RoleMap = {};
  playerIds.forEach((id, i) => {
    map[id] = i === seekerIdx ? 'seeker' : 'hider';
  });
  return map;
}

/** Random assignment: one seeker chosen via `pick`, the rest hiders. */
export function assignRoles(playerIds: readonly string[], pick: PickIndex): RoleMap {
  if (playerIds.length === 0) return {};
  const seekerIdx = clampIndex(pick(playerIds.length), playerIds.length);
  return buildMap(playerIds, seekerIdx);
}

/**
 * Rotate roles so the same player doesn't seek twice in a row: the seeker moves to
 * the next player (in stable id order) after the previous seeker. With ≥2 players this
 * always yields a different seeker.
 */
export function rotateRoles(playerIds: readonly string[], previousSeekerId: string | null): RoleMap {
  if (playerIds.length === 0) return {};
  let seekerIdx = 0;
  if (previousSeekerId) {
    const prev = playerIds.indexOf(previousSeekerId);
    if (prev >= 0) seekerIdx = (prev + 1) % playerIds.length;
  }
  return buildMap(playerIds, seekerIdx);
}

function clampIndex(idx: number, len: number): number {
  if (!Number.isFinite(idx)) return 0;
  const floored = Math.floor(idx);
  if (floored < 0) return 0;
  if (floored >= len) return len - 1;
  return floored;
}
