/**
 * Room-code generation. Codes are uppercase, fixed-length, drawn from an alphabet
 * with ambiguous glyphs excluded (constants.ROOM_CODE_ALPHABET), and collision-checked
 * against the set of codes already in use (F1/F18).
 */
import { randomInt } from 'node:crypto';
import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from '@blendquest/shared';

/** Generate a single random code of ROOM_CODE_LENGTH from the safe alphabet. */
export function makeCode(rand: (max: number) => number = randomInt): string {
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += ROOM_CODE_ALPHABET[rand(ROOM_CODE_ALPHABET.length)];
  }
  return code;
}

/**
 * Generate a code not present in `taken`. Bounded retries; throws only in the
 * astronomically unlikely event the space is saturated (32^5 ≈ 33M codes).
 */
export function generateUniqueCode(
  taken: ReadonlySet<string>,
  rand: (max: number) => number = randomInt,
  maxAttempts = 100,
): string {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const code = makeCode(rand);
    if (!taken.has(code)) return code;
  }
  throw new Error('Unable to allocate a unique room code');
}
