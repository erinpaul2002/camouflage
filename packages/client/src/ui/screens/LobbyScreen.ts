import { MAX_PLAYERS, MIN_PLAYERS } from '@blendquest/shared';
import type { NetClient } from '../../net/NetClient.js';
import type { ClientState } from '../../store/GameStore.js';
import { clear, el } from '../dom.js';
import type { Screen } from '../Screen.js';

/** Lobby: shareable code, live player list, host start button (F2). */
export class LobbyScreen implements Screen {
  readonly el: HTMLElement;
  private readonly codeEl: HTMLElement;
  private readonly listEl: HTMLElement;
  private readonly countEl: HTMLElement;
  private readonly startBtn: HTMLButtonElement;
  private readonly waitEl: HTMLElement;

  constructor(private readonly net: NetClient) {
    this.codeEl = el('div', { className: 'code', title: 'Click to copy', onClick: () => this.copyCode() });
    this.listEl = el('ul', { className: 'bq-players' });
    this.countEl = el('div', { className: 'bq-count' });
    this.startBtn = el('button', { className: 'bq-btn yellow', text: 'Start Game', onClick: () => this.net.startGame() });
    this.waitEl = el('div', { className: 'bq-tag', style: 'margin:10px 0 0' });

    this.el = el('div', { className: 'bq-card' }, [
      el('div', { className: 'bq-tag', text: 'Share this code with friends', style: 'margin-bottom:6px' }),
      el('div', { className: 'bq-code-display' }, [this.codeEl, el('div', { className: 'hint', text: 'tap to copy' })]),
      el('label', { className: 'bq-label', text: 'Players' }),
      this.listEl,
      this.countEl,
      this.startBtn,
      this.waitEl,
    ]);
  }

  private copyCode(): void {
    const code = this.codeEl.textContent ?? '';
    if (code && navigator.clipboard) void navigator.clipboard.writeText(code);
  }

  update(state: ClientState): void {
    const room = state.room;
    if (!room) return;
    this.codeEl.textContent = room.code;

    const players = Object.values(room.players);
    clear(this.listEl);
    for (const p of players) {
      const badges: Node[] = [];
      if (p.isHost) badges.push(el('span', { className: 'bq-badge host', text: 'Host' }));
      if (p.id === state.youId) badges.push(el('span', { className: 'bq-badge you', text: 'You' }));
      this.listEl.append(
        el('li', { className: 'bq-player' }, [
          el('span', { className: 'dot' }),
          el('span', { className: 'name', text: p.name }),
          ...badges,
        ]),
      );
    }

    this.countEl.textContent = `${players.length} / ${MAX_PLAYERS} players`;

    const isHost = room.hostId === state.youId;
    const enough = players.length >= MIN_PLAYERS;
    this.startBtn.style.display = isHost ? 'block' : 'none';
    this.startBtn.disabled = !enough;
    this.startBtn.textContent = enough ? 'Start Game' : `Need ${MIN_PLAYERS}+ players`;
    this.waitEl.textContent = isHost
      ? ''
      : enough
        ? 'Waiting for the host to start…'
        : `Waiting for ${MIN_PLAYERS}+ players…`;
  }
}
