import { describe, expect, it } from 'vitest';
import { BOARD_HEIGHT, BOARD_WIDTH, HIDER_SEEK_SPEED, SEEKER_MOVE_SPEED } from '@blendquest/shared';
import { clampMove, maxSpeedFor } from './movement.js';

describe('maxSpeedFor', () => {
  it('lets hiders move fast in prep but crawl in seek', () => {
    expect(maxSpeedFor('hider', 'prep')).toBeGreaterThan(maxSpeedFor('hider', 'seek'));
    expect(maxSpeedFor('hider', 'seek')).toBe(HIDER_SEEK_SPEED);
  });
  it('keeps the seeker at full speed in seek', () => {
    expect(maxSpeedFor('seeker', 'seek')).toBe(SEEKER_MOVE_SPEED);
  });
  it('forbids movement outside prep/seek', () => {
    expect(maxSpeedFor('hider', 'lobby')).toBe(0);
    expect(maxSpeedFor('seeker', 'round_end')).toBe(0);
  });
});

describe('clampMove', () => {
  const from = { x: 100, y: 100 };

  it('allows a small in-range move fully', () => {
    const to = { x: 110, y: 100 };
    expect(clampMove(from, to, 300, 100)).toEqual(to);
  });

  it('caps a teleport to the max distance for the elapsed time', () => {
    const to = { x: 1000, y: 100 }; // 900px away
    const result = clampMove(from, to, 200, 100); // 200px/s * 0.1s * tol -> ~27px
    expect(result.x).toBeGreaterThan(from.x);
    expect(result.x).toBeLessThan(200);
    expect(result.y).toBe(100);
  });

  it('clamps the target to the board bounds', () => {
    const result = clampMove({ x: BOARD_WIDTH - 5, y: 5 }, { x: BOARD_WIDTH + 500, y: -50 }, 9999, 500);
    expect(result.x).toBeLessThanOrEqual(BOARD_WIDTH);
    expect(result.y).toBeGreaterThanOrEqual(0);
    expect(result.y).toBeLessThanOrEqual(BOARD_HEIGHT);
  });

  it('does not move when speed is zero (wrong phase)', () => {
    expect(clampMove(from, { x: 200, y: 200 }, 0, 100)).toEqual(from);
  });

  it('caps banked time so a long pause cannot enable a huge jump', () => {
    const to = { x: 1000, y: 100 };
    const moved = clampMove(from, to, 200, 100000); // huge dt, but capped at 500ms
    expect(moved.x - from.x).toBeLessThanOrEqual(200 * 0.5 * 1.35 + 0.001);
  });
});
