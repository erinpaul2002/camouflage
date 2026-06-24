/**
 * Pure paintball hit-testing (F11). Server-authoritative: a fired paintball hits the closest
 * unfound hider within the hit radius of the target point (one paintball reveals one hider).
 */
import { type RoomState, type Vec2 } from '@blendquest/shared';

export function findHit(state: RoomState, target: Vec2, radius: number): string | null {
  let bestId: string | null = null;
  let bestDist = radius;
  for (const p of Object.values(state.players)) {
    if (p.role !== 'hider' || p.found) continue;
    const dist = Math.hypot(p.pos.x - target.x, p.pos.y - target.y);
    if (dist <= bestDist) {
      bestDist = dist;
      bestId = p.id;
    }
  }
  return bestId;
}
