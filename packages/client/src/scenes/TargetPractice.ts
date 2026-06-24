import Phaser from 'phaser';
import { BOARD_HEIGHT, BOARD_WIDTH, PAINTBALL_COLORS } from '@blendquest/shared';
import { CharacterSprite } from '../entities/CharacterSprite.js';

/**
 * Seeker prep mini-game (PRD §4.5 / F8): a blank canvas with a randomly-moving white
 * humanoid to warm up the paintball gun while hiders paint. Practice only — no scoring.
 */
export class TargetPractice {
  active = false;
  private bg: Phaser.GameObjects.Rectangle | null = null;
  private hint: Phaser.GameObjects.Text | null = null;
  private dummy: CharacterSprite | null = null;
  private splats: Phaser.GameObjects.Graphics | null = null;
  private vx = 180;
  private vy = 140;

  constructor(private readonly scene: Phaser.Scene) {}

  start(): void {
    if (this.active) return;
    this.active = true;
    this.bg = this.scene.add
      .rectangle(BOARD_WIDTH / 2, BOARD_HEIGHT / 2, BOARD_WIDTH, BOARD_HEIGHT, 0xf4f4ff)
      .setDepth(40);
    this.splats = this.scene.add.graphics().setDepth(41);
    this.dummy = new CharacterSprite(this.scene, BOARD_WIDTH / 2, BOARD_HEIGHT / 2, 'target');
    this.dummy.setDepth(42);
    this.hint = this.scene.add
      .text(BOARD_WIDTH / 2, 70, 'Target practice — click to fire paintballs!', {
        fontFamily: '"Baloo 2", system-ui, sans-serif',
        fontSize: '26px',
        color: '#20204e',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(43);
  }

  stop(): void {
    if (!this.active) return;
    this.active = false;
    this.bg?.destroy();
    this.hint?.destroy();
    this.dummy?.destroy();
    this.splats?.destroy();
    this.bg = this.hint = null;
    this.dummy = null;
    this.splats = null;
  }

  fire(x: number, y: number): void {
    if (!this.splats) return;
    const color = Phaser.Display.Color.HexStringToColor(
      PAINTBALL_COLORS[Math.floor(Math.random() * PAINTBALL_COLORS.length)]!,
    ).color;
    const splat = this.splats;
    splat.fillStyle(color, 0.9);
    splat.fillCircle(x, y, 18);
    for (let i = 0; i < 5; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = 10 + Math.random() * 18;
      splat.fillCircle(x + Math.cos(a) * d, y + Math.sin(a) * d, 4 + Math.random() * 6);
    }
  }

  update(deltaMs: number): void {
    if (!this.dummy) return;
    const dt = deltaMs / 1000;
    let nx = this.dummy.x + this.vx * dt;
    let ny = this.dummy.y + this.vy * dt;
    if (nx < 80 || nx > BOARD_WIDTH - 80) {
      this.vx *= -1;
      nx = Phaser.Math.Clamp(nx, 80, BOARD_WIDTH - 80);
    }
    if (ny < 130 || ny > BOARD_HEIGHT - 80) {
      this.vy *= -1;
      ny = Phaser.Math.Clamp(ny, 130, BOARD_HEIGHT - 80);
    }
    this.dummy.setPosition(nx, ny);
  }
}
