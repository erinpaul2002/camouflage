import { describe, expect, it } from 'vitest';
import { assignRoles, rotateRoles } from './roles.js';

const ids = ['a', 'b', 'c', 'd'];

describe('assignRoles', () => {
  it('assigns exactly one seeker and the rest hiders', () => {
    const map = assignRoles(ids, () => 2);
    const seekers = Object.values(map).filter((r) => r === 'seeker');
    expect(seekers).toHaveLength(1);
    expect(map.c).toBe('seeker');
    expect(map.a).toBe('hider');
  });

  it('returns an empty map for no players', () => {
    expect(assignRoles([], () => 0)).toEqual({});
  });

  it('clamps an out-of-range pick to a valid seeker', () => {
    const map = assignRoles(ids, () => 99);
    expect(Object.values(map).filter((r) => r === 'seeker')).toHaveLength(1);
    expect(map.d).toBe('seeker');
  });
});

describe('rotateRoles', () => {
  it('moves the seeker to the next player in order', () => {
    const map = rotateRoles(ids, 'b');
    expect(map.c).toBe('seeker');
    expect(Object.values(map).filter((r) => r === 'seeker')).toHaveLength(1);
  });

  it('wraps around at the end of the list', () => {
    const map = rotateRoles(ids, 'd');
    expect(map.a).toBe('seeker');
  });

  it('never keeps the same seeker with ≥2 players', () => {
    let prev = 'a';
    for (let i = 0; i < 10; i++) {
      const map = rotateRoles(ids, prev);
      const next = Object.keys(map).find((id) => map[id] === 'seeker')!;
      expect(next).not.toBe(prev);
      prev = next;
    }
  });

  it('defaults to the first player when previous seeker is unknown', () => {
    expect(rotateRoles(ids, null).a).toBe('seeker');
    expect(rotateRoles(ids, 'zzz').a).toBe('seeker');
  });
});
