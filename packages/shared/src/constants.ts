/**
 * Game-wide constants. No magic numbers inline anywhere else — import from here.
 * Timers stay within the PRD/FEATURES ranges (Prep 60–90s, Seek 90–120s).
 */

// ── Room / lobby ────────────────────────────────────────────────────────────
export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 8;

/** Room codes: 5 chars, ambiguous glyphs (O/0, I/1) excluded for shareability. */
export const ROOM_CODE_LENGTH = 5;
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const MAX_NAME_LENGTH = 16;

// ── Phase timers (seconds) ──────────────────────────────────────────────────
export const ROLE_REVEAL_SECONDS = 4;
export const PREP_SECONDS = 75; // within 60–90
export const SEEK_SECONDS = 105; // within 90–120
export const ROUND_END_SECONDS = 9;

// ── Board / movement ────────────────────────────────────────────────────────
export const BOARD_WIDTH = 1280;
export const BOARD_HEIGHT = 720;

/** Movement speeds in px/s, used for server-side bounds + anti-teleport checks. */
export const HIDER_PREP_SPEED = 230;
export const SEEKER_MOVE_SPEED = 250;
export const HIDER_SEEK_SPEED = 95; // deliberately slow — moving = riskier (F6/F11)

/** Tolerance multiplier applied to max speed when validating a move delta. */
export const MOVE_SPEED_TOLERANCE = 1.35;

/** Position broadcast rate (Hz) for players_delta during prep/seek. */
export const TICK_HZ = 12;

// ── Painting ────────────────────────────────────────────────────────────────
export const CHARACTER_CANVAS_WIDTH = 192;
export const CHARACTER_CANVAS_HEIGHT = 256;
export const POSE_COUNT = 4;
export const MAX_PAINT_BLOB_BYTES = 256 * 1024;

// ── Seek / paintball ────────────────────────────────────────────────────────
export const PAINTBALL_COOLDOWN_MS = 1100;
export const PAINTBALL_HIT_RADIUS = 40;
export const PAINTBALL_COLORS = [
  '#FF4D6D',
  '#FFD23F',
  '#4DD4FF',
  '#7CFF6B',
  '#C77DFF',
  '#FF9F45',
] as const;

// ── Scoring ─────────────────────────────────────────────────────────────────
export const SCORE_HIDER_SURVIVE = 100;
export const SCORE_SEEKER_FIND = 75;
export const SCORE_HIDER_FOUND = 0;

// ── Environments (F10) ──────────────────────────────────────────────────────
export const ENVIRONMENT_IDS = ['forest', 'underwater', 'candy', 'urban', 'abstract'] as const;
export type EnvironmentId = (typeof ENVIRONMENT_IDS)[number];
