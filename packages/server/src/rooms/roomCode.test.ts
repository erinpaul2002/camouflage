import { describe, expect, it } from 'vitest';
import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from '@blendquest/shared';
import { generateUniqueCode, makeCode } from './roomCode.js';

describe('roomCode', () => {
  it('produces a code of the configured length from the safe alphabet', () => {
    const code = makeCode();
    expect(code).toHaveLength(ROOM_CODE_LENGTH);
    for (const ch of code) {
      expect(ROOM_CODE_ALPHABET).toContain(ch);
    }
  });

  it('never contains ambiguous glyphs (O, 0, I, 1)', () => {
    for (let i = 0; i < 200; i++) {
      expect(makeCode()).not.toMatch(/[O0I1]/);
    }
  });

  it('avoids collisions with already-taken codes', () => {
    // Deterministic rand: first call would yield a taken code, then a fresh one.
    let calls = 0;
    const taken = new Set([makeCode(() => 0)]); // 'AAAAA'
    const rand = (_max: number): number => {
      calls++;
      // First ROOM_CODE_LENGTH calls -> 0 (collides), then -> 1 (unique).
      return calls <= ROOM_CODE_LENGTH ? 0 : 1;
    };
    const code = generateUniqueCode(taken, rand);
    expect(taken.has(code)).toBe(false);
    expect(code).toHaveLength(ROOM_CODE_LENGTH);
  });

  it('throws if it cannot find a free code within the attempt budget', () => {
    const taken = new Set([makeCode(() => 0)]);
    expect(() => generateUniqueCode(taken, () => 0, 5)).toThrow(/unique room code/i);
  });
});
