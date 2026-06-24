import Phaser from 'phaser';
import { BOARD_HEIGHT, BOARD_WIDTH } from '@blendquest/shared';
import { Palette } from '../theme.js';

const BLOB_COLORS = [Palette.accent, Palette.accent2, Palette.accent3, Palette.good];

/**
 * Ambient animated backdrop behind the menu/lobby overlays. Replaced by real
 * environment backgrounds during prep/seek (Phase 4).
 */
export class BackgroundScene extends Phaser.Scene {
  constructor() {
    super('Background');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(Palette.bgDeep);

    for (let i = 0; i < 7; i++) {
      const x = Phaser.Math.Between(0, BOARD_WIDTH);
      const y = Phaser.Math.Between(0, BOARD_HEIGHT);
      const radius = Phaser.Math.Between(90, 220);
      const color = BLOB_COLORS[i % BLOB_COLORS.length]!;
      const blob = this.add.circle(x, y, radius, color, 0.1);

      this.tweens.add({
        targets: blob,
        x: x + Phaser.Math.Between(-160, 160),
        y: y + Phaser.Math.Between(-120, 120),
        duration: Phaser.Math.Between(6000, 11000),
        ease: 'Sine.inOut',
        yoyo: true,
        repeat: -1,
      });
    }
  }
}
