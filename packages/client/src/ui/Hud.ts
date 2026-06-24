import type { ClientState, GameStore } from '../store/GameStore.js';
import { el } from './dom.js';
import type { Screen } from './Screen.js';

const PHASE_LABEL: Record<string, string> = { prep: 'PAINT & HIDE', seek: 'SEEK' };

/**
 * Minimal in-game HUD (F14): role, phase countdown, hiders remaining. A top bar that
 * doesn't block the world canvas. Updates the countdown every frame from the store clock.
 */
export class Hud implements Screen {
  readonly el: HTMLElement;
  private readonly roleEl: HTMLElement;
  private readonly phaseEl: HTMLElement;
  private readonly timerEl: HTMLElement;
  private readonly remainingEl: HTMLElement;
  private raf = 0;

  constructor(private readonly store: GameStore) {
    this.roleEl = el('div', { className: 'bq-hud-role' });
    this.phaseEl = el('div', { className: 'bq-hud-phase' });
    this.timerEl = el('div', { className: 'bq-hud-timer' });
    this.remainingEl = el('div', { className: 'bq-hud-remaining' });

    this.el = el('div', { className: 'bq-hud' }, [
      el('div', { className: 'bq-hud-left' }, [this.roleEl]),
      el('div', { className: 'bq-hud-center' }, [this.timerEl, this.phaseEl]),
      el('div', { className: 'bq-hud-right' }, [this.remainingEl]),
    ]);
    this.loop();
  }

  private loop = (): void => {
    const secs = Math.ceil(this.store.phaseRemainingMs() / 1000);
    this.timerEl.textContent = `${secs}`;
    this.timerEl.classList.toggle('urgent', secs <= 10);
    this.raf = requestAnimationFrame(this.loop);
  };

  update(state: ClientState): void {
    const room = state.room;
    if (!room) return;
    const you = room.players[state.youId];
    const role = you?.role ?? 'hider';
    this.roleEl.textContent = role === 'seeker' ? '🎯 Seeker' : '🎨 Hider';
    this.roleEl.className = `bq-hud-role ${role}`;
    this.phaseEl.textContent = PHASE_LABEL[room.phase] ?? '';

    const hiders = Object.values(room.players).filter((p) => p.role === 'hider');
    const hiding = hiders.filter((p) => !p.found).length;
    this.remainingEl.textContent = `${hiding} hiding`;
  }

  destroy(): void {
    cancelAnimationFrame(this.raf);
  }
}
