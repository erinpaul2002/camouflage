import { describe, expect, it } from 'vitest';
import {
  createRoomSchema,
  firePaintballSchema,
  joinRoomSchema,
  moveSchema,
  paintCommitSchema,
  roomCodeSchema,
  setPoseSchema,
  validate,
} from './validation.js';
import { BOARD_WIDTH, MAX_PAINT_BLOB_BYTES, POSE_COUNT } from './constants.js';

describe('roomCodeSchema', () => {
  it('uppercases and accepts a valid 5-char code', () => {
    const r = validate(roomCodeSchema, 'abcde');
    expect(r).toEqual({ ok: true, value: 'ABCDE' });
  });
  it('rejects ambiguous glyphs and wrong length', () => {
    expect(validate(roomCodeSchema, 'ABCD0').ok).toBe(false); // 0 not in alphabet
    expect(validate(roomCodeSchema, 'ABC').ok).toBe(false);
  });
});

describe('name validation', () => {
  it('rejects empty and over-long names', () => {
    expect(validate(createRoomSchema, { name: '' }).ok).toBe(false);
    expect(validate(createRoomSchema, { name: 'x'.repeat(40) }).ok).toBe(false);
  });
  it('accepts and trims a normal name', () => {
    const r = validate(joinRoomSchema, { code: 'ABCDE', name: '  Bee ' });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.name).toBe('Bee');
  });
});

describe('moveSchema (F18 bounds)', () => {
  it('accepts in-bounds positions', () => {
    expect(validate(moveSchema, { pos: { x: 10, y: 10 }, rotation: 0 }).ok).toBe(true);
  });
  it('rejects out-of-bounds and non-finite positions', () => {
    expect(validate(moveSchema, { pos: { x: BOARD_WIDTH + 5, y: 0 }, rotation: 0 }).ok).toBe(false);
    expect(validate(moveSchema, { pos: { x: Infinity, y: 0 }, rotation: 0 }).ok).toBe(false);
  });
});

describe('setPoseSchema', () => {
  it('accepts valid pose indices and rejects out-of-range', () => {
    expect(validate(setPoseSchema, { pose: 0 }).ok).toBe(true);
    expect(validate(setPoseSchema, { pose: POSE_COUNT }).ok).toBe(false);
    expect(validate(setPoseSchema, { pose: -1 }).ok).toBe(false);
  });
});

describe('paintCommitSchema (F9/F18 size cap)', () => {
  it('rejects an oversized blob', () => {
    const huge = 'a'.repeat(Math.ceil((MAX_PAINT_BLOB_BYTES * 4) / 3) + 10);
    expect(validate(paintCommitSchema, { blob: huge, version: 1 }).ok).toBe(false);
  });
  it('accepts a small blob', () => {
    expect(validate(paintCommitSchema, { blob: 'data', version: 1 }).ok).toBe(true);
  });
});

describe('firePaintballSchema', () => {
  it('validates the target position', () => {
    expect(validate(firePaintballSchema, { targetPos: { x: 5, y: 5 } }).ok).toBe(true);
    expect(validate(firePaintballSchema, { targetPos: { x: -1, y: 5 } }).ok).toBe(false);
  });
});
