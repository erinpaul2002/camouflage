import type Phaser from 'phaser';
import type { ClientState, GameStore } from './store/GameStore.js';

const PLAY_PHASES = new Set(['role_reveal', 'prep', 'seek', 'round_end']);

/**
 * Bridges the store's phase to the Phaser scene graph: starts the WorldScene when a game
 * begins and stops it (back to the ambient Background) when there's no active room.
 * Keeps UI logic (DOM) and rendering (Phaser) decoupled.
 */
export class SceneDirector {
  private worldActive = false;

  constructor(
    private readonly game: Phaser.Game,
    store: GameStore,
  ) {
    store.subscribe((s) => this.sync(s));
  }

  private sync(state: ClientState): void {
    const inGame = state.room !== null && PLAY_PHASES.has(state.room.phase);
    if (inGame && !this.worldActive) {
      this.game.scene.start('World');
      this.worldActive = true;
    } else if (!inGame && this.worldActive) {
      this.game.scene.stop('World');
      this.worldActive = false;
    }
  }
}
