/**
 * Owns the local player's PaintBuffer and coordinates its lifecycle with the game phase:
 * fresh canvas each prep, auto-commit to the server at prep→seek (F9). Shared with the
 * Phaser world (to display) and the studio (to paint) via the game registry.
 */
import type { Phase } from '@blendquest/shared';
import type { GameStore, ClientState } from '../store/GameStore.js';
import type { NetClient } from '../net/NetClient.js';
import { PaintBuffer } from './PaintBuffer.js';

export class PaintSession {
  readonly buffer = new PaintBuffer();
  private lastPhase: Phase | null = null;

  constructor(
    private readonly store: GameStore,
    private readonly net: NetClient,
  ) {
    this.store.subscribe((s) => this.onChange(s));
  }

  private onChange(state: ClientState): void {
    const room = state.room;
    if (!room) {
      this.lastPhase = null;
      return;
    }
    if (room.phase === this.lastPhase) return;
    const prev = this.lastPhase;
    this.lastPhase = room.phase;

    const you = room.players[state.youId];
    const isHider = you?.role === 'hider';

    if (room.phase === 'prep') {
      this.buffer.clear(); // new round → blank character
    }
    // Commit the finished painting as prep ends.
    if (prev === 'prep' && room.phase === 'seek' && isHider && this.buffer.painted) {
      this.net.paintCommit({ blob: this.buffer.toBase64(), version: this.buffer.version });
    }
  }
}
