/**
 * Mounts the DOM overlay and swaps the active screen based on the store's phase.
 * A screen is rebuilt only when the screen *key* changes (so inputs keep focus and
 * animations aren't restarted on every snapshot). The in-game HUD is non-blocking so the
 * Phaser world canvas receives pointer/keyboard input.
 */
import type { NetClient } from '../net/NetClient.js';
import type { PaintSession } from '../paint/PaintSession.js';
import type { ClientState, GameStore } from '../store/GameStore.js';
import { audio } from '../audio/audio.js';
import { el } from './dom.js';
import { injectStyles } from './styles.js';
import type { Screen } from './Screen.js';
import { MenuScreen } from './screens/MenuScreen.js';
import { LobbyScreen } from './screens/LobbyScreen.js';
import { RoleRevealScreen } from './screens/RoleRevealScreen.js';
import { RoundEndScreen } from './screens/RoundEndScreen.js';
import { PlayScreen } from './screens/PlayScreen.js';

type ScreenKey = 'menu' | 'lobby' | 'role_reveal' | 'play' | 'round_end';

export class UIRoot {
  private readonly container: HTMLElement;
  private currentKey: ScreenKey | null = null;
  private current: Screen | null = null;

  constructor(
    private readonly store: GameStore,
    private readonly net: NetClient,
    private readonly paint: PaintSession,
  ) {
    injectStyles();
    this.container = document.createElement('div');
    this.container.id = 'ui';
    document.body.append(this.container);
    this.mountMuteButton();
    this.store.subscribe((s) => this.render(s));
  }

  private mountMuteButton(): void {
    const btn = el('button', {
      className: 'bq-mute',
      title: 'Toggle sound',
      text: audio.isMuted() ? '🔇' : '🔊',
    });
    btn.addEventListener('click', () => {
      const muted = audio.toggleMute();
      btn.textContent = muted ? '🔇' : '🔊';
      if (!muted) audio.sfx('click');
    });
    document.body.append(btn);
  }

  private keyFor(state: ClientState): ScreenKey {
    const room = state.room;
    if (!room) return 'menu';
    switch (room.phase) {
      case 'lobby':
        return 'lobby';
      case 'role_reveal':
        return 'role_reveal';
      case 'round_end':
        return 'round_end';
      default:
        return 'play';
    }
  }

  private build(key: ScreenKey): Screen {
    switch (key) {
      case 'menu':
        return new MenuScreen(this.net);
      case 'lobby':
        return new LobbyScreen(this.net);
      case 'role_reveal':
        return new RoleRevealScreen();
      case 'round_end':
        return new RoundEndScreen(this.store);
      case 'play':
        return new PlayScreen(this.store, this.net, this.paint);
    }
  }

  private render(state: ClientState): void {
    const key = this.keyFor(state);
    if (key !== this.currentKey) {
      this.current?.destroy?.();
      this.container.replaceChildren();
      this.current = this.build(key);
      this.currentKey = key;
      this.container.classList.toggle('play', key === 'play');
      this.container.append(this.current.el);
    }
    this.current?.update(state);
  }
}
