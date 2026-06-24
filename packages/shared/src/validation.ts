/**
 * zod schemas for every inbound intent (TECH_DESIGN §10, F18). The server validates
 * EVERY payload here before the engine sees it. Never trust the client.
 */
import { z } from 'zod';
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  MAX_NAME_LENGTH,
  MAX_PAINT_BLOB_BYTES,
  POSE_COUNT,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
} from './constants.js';

const codeRegex = new RegExp(`^[${ROOM_CODE_ALPHABET}]{${ROOM_CODE_LENGTH}}$`);

export const nameSchema = z
  .string()
  .trim()
  .min(1, 'Name required')
  .max(MAX_NAME_LENGTH, 'Name too long');

export const roomCodeSchema = z
  .string()
  .trim()
  .transform((s) => s.toUpperCase())
  .pipe(z.string().regex(codeRegex, 'Invalid room code'));

const vec2Schema = z.object({
  x: z.number().finite().min(0).max(BOARD_WIDTH),
  y: z.number().finite().min(0).max(BOARD_HEIGHT),
});

export const createRoomSchema = z.object({ name: nameSchema });

export const joinRoomSchema = z.object({ code: roomCodeSchema, name: nameSchema });

export const startGameSchema = z.object({}).strict();

export const moveSchema = z.object({
  pos: vec2Schema,
  rotation: z.number().finite().min(-Math.PI * 2).max(Math.PI * 2),
});

export const setPoseSchema = z.object({
  pose: z.number().int().min(0).max(POSE_COUNT - 1),
});

export const paintCommitSchema = z.object({
  // base64 grows ~4/3 vs bytes; cap on the encoded string length accordingly.
  blob: z
    .string()
    .max(Math.ceil((MAX_PAINT_BLOB_BYTES * 4) / 3), 'Paint blob too large'),
  version: z.number().int().min(0),
});

export const firePaintballSchema = z.object({ targetPos: vec2Schema });

export const leaveRoomSchema = z.object({}).strict();

/** Result wrapper so callers don't deal with thrown ZodErrors at the boundary. */
export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export function validate<T>(schema: z.ZodType<T>, data: unknown): ValidationResult<T> {
  const parsed = schema.safeParse(data);
  if (parsed.success) return { ok: true, value: parsed.data };
  const first = parsed.error.issues[0];
  return { ok: false, error: first ? first.message : 'Invalid payload' };
}
