import { describe, expect, it } from 'vitest';
import { PAINTBALL_HIT_RADIUS } from '@blendquest/shared';
import { addPlayer, createRoom, startGame } from './room.js';
import { findHit } from './combat.js';

function game() {
  let s = createRoom('ABCDE', 'p0', 'Seeker', 'forest');
  s = addPlayer(s, 'p1', 'A');
  s = addPlayer(s, 'p2', 'B');
  s = startGame(s, 0, () => 0); // p0 seeker, p1/p2 hiders
  // place hiders at known spots
  s = { ...s, players: { ...s.players, p1: { ...s.players.p1!, pos: { x: 100, y: 100 } }, p2: { ...s.players.p2!, pos: { x: 500, y: 500 } } } };
  return s;
}

describe('findHit', () => {
  it('returns the hider within the hit radius', () => {
    expect(findHit(game(), { x: 110, y: 105 }, PAINTBALL_HIT_RADIUS)).toBe('p1');
  });

  it('returns null when the shot misses everyone', () => {
    expect(findHit(game(), { x: 800, y: 100 }, PAINTBALL_HIT_RADIUS)).toBeNull();
  });

  it('never targets the seeker or an already-found hider', () => {
    let s = game();
    s = { ...s, players: { ...s.players, p1: { ...s.players.p1!, found: true } } };
    expect(findHit(s, { x: 100, y: 100 }, PAINTBALL_HIT_RADIUS)).toBeNull();
    // seeker sits at its spawn; a shot there hits nobody
    expect(findHit(game(), s.players.p0!.pos, PAINTBALL_HIT_RADIUS)).toBeNull();
  });

  it('picks the closest hider when two are near', () => {
    let s = game();
    s = { ...s, players: { ...s.players, p2: { ...s.players.p2!, pos: { x: 130, y: 100 } } } };
    expect(findHit(s, { x: 120, y: 100 }, PAINTBALL_HIT_RADIUS)).toBe('p2');
  });
});
