import Phaser from 'phaser';
import { BOARD_HEIGHT, BOARD_WIDTH } from '@blendquest/shared';
import { Palette } from './theme.js';
import { BackgroundScene } from './scenes/BackgroundScene.js';
import { WorldScene } from './scenes/WorldScene.js';
import { NetClient } from './net/NetClient.js';
import { GameStore } from './store/GameStore.js';
import { UIRoot } from './ui/UIRoot.js';
import { SceneDirector } from './SceneDirector.js';
import { PaintSession } from './paint/PaintSession.js';
import { audio } from './audio/audio.js';
import type { Phase } from '@blendquest/shared';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: `#${Palette.bgDeep.toString(16).padStart(6, '0')}`,
  width: BOARD_WIDTH,
  height: BOARD_HEIGHT,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    antialias: true,
    powerPreference: 'high-performance',
  },
  scene: [BackgroundScene, WorldScene],
};

// Phaser canvas (ambient background + game world).
export const game = new Phaser.Game(config);

// Networking + state + paint + DOM overlay UI.
const net = new NetClient();
const store = new GameStore(net);
const paint = new PaintSession(store, net);

// Share store/net/paint with Phaser scenes via the registry once the game is booted.
game.registry.set('store', store);
game.registry.set('net', net);
game.registry.set('paint', paint);

export const ui = new UIRoot(store, net, paint);
export const director = new SceneDirector(game, store);

// Resume audio on the first user gesture (browser autoplay policy).
window.addEventListener('pointerdown', () => audio.resume(), { once: true });

// Audio director: upbeat loop while in a room + round start/end chimes.
let lastAudioPhase: Phase | null = null;
store.subscribe((s) => {
  if (s.room) audio.startMusic();
  else audio.stopMusic();
  const phase = s.room?.phase ?? null;
  if (phase !== lastAudioPhase) {
    if (phase === 'prep' || phase === 'role_reveal') audio.sfx('start');
    else if (phase === 'round_end') audio.sfx('end');
    lastAudioPhase = phase;
  }
});
