import type { Player } from '@blendquest/shared';
import type { ClientState } from '../../store/GameStore.js';
import { el } from '../dom.js';
import type { Screen } from '../Screen.js';

/** Slot-spin roulette revealing the chosen seeker, then the player's own role (F3). */
export class RoleRevealScreen implements Screen {
  readonly el: HTMLElement;
  private readonly slot: HTMLElement;
  private readonly banner: HTMLElement;
  private readonly sub: HTMLElement;
  private started = false;
  private timers: ReturnType<typeof setTimeout>[] = [];

  constructor() {
    this.slot = el('div', { className: 'bq-slot', text: '🎲' });
    this.banner = el('div', { className: 'bq-role-banner', style: 'visibility:hidden' });
    this.sub = el('div', { className: 'bq-role-sub', style: 'visibility:hidden' });

    this.el = el('div', { className: 'bq-card bq-reveal' }, [
      el('div', { className: 'bq-tag', text: 'Spinning for the Seeker…', style: 'margin-bottom:4px' }),
      this.slot,
      this.banner,
      this.sub,
    ]);
  }

  update(state: ClientState): void {
    if (this.started || !state.room) return;
    this.started = true;
    const players = Object.values(state.room.players);
    const seeker = players.find((p) => p.role === 'seeker');
    const you = state.room.players[state.youId];
    if (!seeker) return;
    this.spin(players, seeker, you ?? null);
  }

  private spin(players: Player[], seeker: Player, you: Player | null): void {
    const names = players.map((p) => p.name);
    let elapsed = 0;
    const total = 2400;
    const tick = (): void => {
      // Decelerating cycle: interval grows as we approach the end.
      const random = names[Math.floor(Math.random() * names.length)] ?? '…';
      this.slot.textContent = random;
      const progress = elapsed / total;
      const delay = 60 + progress * progress * 240;
      elapsed += delay;
      if (elapsed < total) {
        this.timers.push(setTimeout(tick, delay));
      } else {
        this.settle(seeker, you);
      }
    };
    tick();
  }

  private settle(seeker: Player, you: Player | null): void {
    this.slot.textContent = `🎯  ${seeker.name}`;
    this.slot.style.borderColor = 'var(--pink)';
    const isSeeker = you?.role === 'seeker';
    this.banner.textContent = isSeeker ? 'You are the SEEKER' : 'You are a HIDER';
    this.banner.className = `bq-role-banner ${isSeeker ? 'seeker' : 'hider'}`;
    this.banner.style.visibility = 'visible';
    this.sub.textContent = isSeeker
      ? 'Warm up your paintball gun — hunt them down!'
      : 'Paint yourself to blend in and hide!';
    this.sub.style.visibility = 'visible';
  }

  destroy(): void {
    this.timers.forEach(clearTimeout);
    this.timers = [];
  }
}
