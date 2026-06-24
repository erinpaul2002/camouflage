import { MAX_NAME_LENGTH, ROOM_CODE_LENGTH } from '@blendquest/shared';
import { audio } from '../../audio/audio.js';
import type { NetClient } from '../../net/NetClient.js';
import type { ClientState } from '../../store/GameStore.js';
import { el } from '../dom.js';
import type { Screen } from '../Screen.js';

const NAME_KEY = 'bq.name';

/** Entry screen: create a room or join one by code (F1). */
export class MenuScreen implements Screen {
  readonly el: HTMLElement;
  private readonly nameInput: HTMLInputElement;
  private readonly codeInput: HTMLInputElement;
  private readonly errorBox: HTMLElement;

  constructor(private readonly net: NetClient) {
    this.nameInput = el('input', {
      className: 'bq-input',
      maxlength: MAX_NAME_LENGTH,
      placeholder: 'Your name',
      value: localStorage.getItem(NAME_KEY) ?? '',
    });
    this.codeInput = el('input', {
      className: 'bq-input code',
      maxlength: ROOM_CODE_LENGTH,
      placeholder: 'CODE',
      autocapitalize: 'characters',
      autocomplete: 'off',
    });
    this.errorBox = el('div', { className: 'bq-error', style: 'display:none' });

    const createBtn = el('button', { className: 'bq-btn primary', text: 'Create Room', onClick: () => this.create() });
    const joinBtn = el('button', { className: 'bq-btn cyan', text: 'Join Room', onClick: () => this.join() });

    this.codeInput.addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Enter') this.join();
    });

    this.el = el('div', { className: 'bq-card' }, [
      el('div', { className: 'bq-title', text: 'BlendQuest' }),
      el('div', { className: 'bq-tag', text: 'Paint. Hide. Get found (or not).' }),
      el('label', { className: 'bq-label', text: 'Nickname' }),
      this.nameInput,
      createBtn,
      el('div', { className: 'bq-divider', text: 'or join a room' }),
      el('label', { className: 'bq-label', text: 'Room code' }),
      this.codeInput,
      joinBtn,
      this.errorBox,
    ]);
  }

  private rememberName(): string {
    const name = this.nameInput.value.trim();
    if (name) localStorage.setItem(NAME_KEY, name);
    return name;
  }

  private create(): void {
    audio.resume();
    audio.sfx('click');
    const name = this.rememberName();
    if (!this.guardName(name)) return;
    this.net.createRoom(name);
  }

  private join(): void {
    audio.resume();
    audio.sfx('click');
    const name = this.rememberName();
    if (!this.guardName(name)) return;
    const code = this.codeInput.value.trim().toUpperCase();
    if (code.length !== ROOM_CODE_LENGTH) {
      this.showError(`Enter a ${ROOM_CODE_LENGTH}-character room code`);
      return;
    }
    this.net.joinRoom(code, name);
  }

  private guardName(name: string): boolean {
    if (!name) {
      this.showError('Pick a nickname first');
      return false;
    }
    return true;
  }

  private showError(message: string): void {
    this.errorBox.textContent = message;
    this.errorBox.style.display = 'block';
  }

  update(state: ClientState): void {
    if (state.error) {
      this.showError(state.error.message);
    }
  }
}
