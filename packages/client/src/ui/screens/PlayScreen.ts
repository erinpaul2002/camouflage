import type { NetClient } from '../../net/NetClient.js';
import type { PaintSession } from '../../paint/PaintSession.js';
import type { ClientState, GameStore } from '../../store/GameStore.js';
import { PaintStudio } from '../../paint/PaintStudio.js';
import { Joystick } from '../../input/Joystick.js';
import { isCoarsePointer } from '../../input/inputState.js';
import { el } from '../dom.js';
import { Hud } from '../Hud.js';
import type { Screen } from '../Screen.js';

/**
 * In-game overlay during prep/seek: the always-on HUD plus, for hiders during prep, the
 * docked paint studio. Non-blocking so the Phaser world keeps keyboard/pointer input.
 */
export class PlayScreen implements Screen {
  readonly el: HTMLElement;
  private readonly hud: Hud;
  private studio: PaintStudio | null = null;
  private joystick: Joystick | null = null;
  private readonly coarse = isCoarsePointer();

  constructor(
    store: GameStore,
    private readonly net: NetClient,
    private readonly paint: PaintSession,
  ) {
    this.hud = new Hud(store);
    this.el = el('div', { className: 'bq-play' }, [this.hud.el]);
  }

  update(state: ClientState): void {
    this.hud.update(state);
    const room = state.room;
    if (!room) return;
    const you = room.players[state.youId];
    const wantStudio = room.phase === 'prep' && you?.role === 'hider';

    if (wantStudio && !this.studio) {
      this.studio = new PaintStudio(this.paint.buffer, room.environmentId, this.net);
      this.el.append(this.studio.el);
    } else if (!wantStudio && this.studio) {
      this.studio.destroy();
      this.studio.el.remove();
      this.studio = null;
    }

    if (this.studio && you) {
      this.studio.updateBg(you.pos.x, you.pos.y);
    }

    // Touch joystick for the seeker during seek (taps fire, so movement needs a stick).
    const wantStick = this.coarse && room.phase === 'seek' && you?.role === 'seeker';
    if (wantStick && !this.joystick) {
      this.joystick = new Joystick();
      this.el.append(this.joystick.el);
    } else if (!wantStick && this.joystick) {
      this.joystick.destroy();
      this.joystick = null;
    }
  }

  destroy(): void {
    this.hud.destroy();
    this.studio?.destroy();
    this.joystick?.destroy();
  }
}
