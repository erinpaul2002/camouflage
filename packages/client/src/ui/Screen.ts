import type { ClientState } from '../store/GameStore.js';

/** A UI overlay screen. Built once when the screen becomes active, updated on each change. */
export interface Screen {
  readonly el: HTMLElement;
  update(state: ClientState): void;
  destroy?(): void;
}
