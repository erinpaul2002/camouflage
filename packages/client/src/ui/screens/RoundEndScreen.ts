import type { ClientState, GameStore } from '../../store/GameStore.js';
import { clear, el } from '../dom.js';
import type { Screen } from '../Screen.js';

/** Round-end scoreboard + reveal (F13): winner banner, scores, next-round countdown. */
export class RoundEndScreen implements Screen {
  readonly el: HTMLElement;
  private readonly banner: HTMLElement;
  private readonly listEl: HTMLElement;
  private readonly nextEl: HTMLElement;
  private raf = 0;

  constructor(private readonly store: GameStore) {
    this.banner = el('div', { className: 'bq-role-banner' });
    this.listEl = el('ul', { className: 'bq-players' });
    this.nextEl = el('div', { className: 'bq-tag', style: 'margin-top:14px' });

    this.el = el('div', { className: 'bq-card bq-reveal' }, [
      el('div', { className: 'bq-tag', text: 'Round Over', style: 'margin-bottom:2px' }),
      this.banner,
      el('label', { className: 'bq-label', text: 'Scores' }),
      this.listEl,
      this.nextEl,
    ]);
    this.loop();
  }

  private loop = (): void => {
    const secs = Math.ceil(this.store.phaseRemainingMs() / 1000);
    this.nextEl.textContent = `Next round in ${secs}s…`;
    this.raf = requestAnimationFrame(this.loop);
  };

  update(state: ClientState): void {
    const room = state.room;
    const result = room?.lastResult;
    if (!room || !result) return;

    const youWon =
      (result.winner === 'seekers' && room.players[state.youId]?.role === 'seeker') ||
      (result.winner === 'hiders' && room.players[state.youId]?.role === 'hider');
    this.banner.textContent =
      result.winner === 'seekers' ? '🎯 Seeker wins!' : '🎨 Hiders win!';
    this.banner.className = `bq-role-banner ${youWon ? 'hider' : 'seeker'}`;

    const rows = Object.values(room.players).sort((a, b) => b.score - a.score);
    clear(this.listEl);
    for (const p of rows) {
      const isYou = p.id === state.youId;
      this.listEl.append(
        el('li', { className: 'bq-player' }, [
          el('span', { className: `dot ${p.role ?? ''}` }),
          el('span', { className: 'name', text: p.name + (isYou ? ' (you)' : '') }),
          el('span', { className: 'bq-badge host', text: `${p.score}` }),
        ]),
      );
    }
  }

  destroy(): void {
    cancelAnimationFrame(this.raf);
  }
}
