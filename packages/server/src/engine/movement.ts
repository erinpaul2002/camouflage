/**
 * Pure movement validation (F6/F18). The server never trusts a client position: it clamps
 * the requested move to the player's max speed for the current role+phase, and to the board
 * bounds. Anti-teleport: distance is capped by speed × elapsed time.
 */
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  HIDER_PREP_SPEED,
  HIDER_SEEK_SPEED,
  MOVE_SPEED_TOLERANCE,
  SEEKER_MOVE_SPEED,
  type Phase,
  type Role,
  type Vec2,
} from '@blendquest/shared';

/** Max speed (px/s) for a role in a phase. Hiders crawl during seek (risk/reward). */
export function maxSpeedFor(role: Role | null, phase: Phase): number {
  if (phase === 'prep') return role === 'seeker' ? SEEKER_MOVE_SPEED : HIDER_PREP_SPEED;
  if (phase === 'seek') return role === 'seeker' ? SEEKER_MOVE_SPEED : HIDER_SEEK_SPEED;
  return 0; // no movement outside prep/seek
}

function clampToBoard(p: Vec2): Vec2 {
  return {
    x: Math.min(BOARD_WIDTH, Math.max(0, p.x)),
    y: Math.min(BOARD_HEIGHT, Math.max(0, p.y)),
  };
}

/**
 * Clamp a requested move. Returns the furthest legal position toward `to` given the elapsed
 * time since the player's last accepted move. `dtMs` is clamped to a sane window so a long
 * pause can't bank up a huge teleport.
 */
export function clampMove(
  from: Vec2,
  to: Vec2,
  maxSpeedPxPerSec: number,
  dtMs: number,
): Vec2 {
  const target = clampToBoard(to);
  if (maxSpeedPxPerSec <= 0) return from;

  const dt = Math.min(Math.max(dtMs, 0), 500) / 1000; // cap banked time at 500ms
  const maxDist = maxSpeedPxPerSec * dt * MOVE_SPEED_TOLERANCE;

  const dx = target.x - from.x;
  const dy = target.y - from.y;
  const dist = Math.hypot(dx, dy);
  if (dist <= maxDist || dist === 0) return target;

  const scale = maxDist / dist;
  return clampToBoard({ x: from.x + dx * scale, y: from.y + dy * scale });
}
