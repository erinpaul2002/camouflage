import Phaser from 'phaser';
import { Palette } from '../theme.js';
import { SILHOUETTE } from '../paint/silhouette.js';

export const CHAR_W = 60;
export const CHAR_H = 84;

/** Preset poses (F7): small rotations + a mirror, applied to the whole character. */
const POSE_ROTATION = [0, -0.18, 0.18, 0];
const POSE_FLIP = [1, 1, 1, -1];

/**
 * A player's on-board character: a white featureless humanoid (PRD §4.2) drawn with the
 * shared SILHOUETTE ratios so a painted texture lines up exactly. Carries a name label,
 * a role/you ring, a paint layer, and a "found" mark.
 */
export class CharacterSprite extends Phaser.GameObjects.Container {
  private readonly bodyGfx: Phaser.GameObjects.Graphics;
  private readonly ring: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private paintImg: Phaser.GameObjects.Image | null = null;
  private foundMark: Phaser.GameObjects.Text | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, name: string) {
    super(scene, x, y);
    this.ring = scene.add.graphics();
    this.bodyGfx = scene.add.graphics();
    this.label = scene.add
      .text(0, CHAR_H / 2 + 12, name, {
        fontFamily: '"Nunito", system-ui, sans-serif',
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5, 0);

    this.drawBody();
    this.add([this.ring, this.bodyGfx, this.label]);
    scene.add.existing(this);
  }

  private drawBody(): void {
    const g = this.bodyGfx;
    const s = SILHOUETTE;
    g.clear();
    g.fillStyle(0xffffff, 1);
    
    // Fill shapes, coordinates shifted to be centered at (0,0)
    g.fillCircle(s.headCx * CHAR_W - CHAR_W / 2, s.headCy * CHAR_H - CHAR_H / 2, s.headR * CHAR_W);
    g.fillRoundedRect(s.torsoX * CHAR_W - CHAR_W / 2, s.torsoY * CHAR_H - CHAR_H / 2, s.torsoW * CHAR_W, s.torsoH * CHAR_H, s.torsoRadius * CHAR_W);
    g.fillRoundedRect(s.armLeftX * CHAR_W - CHAR_W / 2, s.armLeftY * CHAR_H - CHAR_H / 2, s.armLeftW * CHAR_W, s.armLeftH * CHAR_H, s.armRadius * CHAR_W);
    g.fillRoundedRect(s.armRightX * CHAR_W - CHAR_W / 2, s.armRightY * CHAR_H - CHAR_H / 2, s.armRightW * CHAR_W, s.armRightH * CHAR_H, s.armRadius * CHAR_W);
    g.fillRoundedRect(s.legLeftX * CHAR_W - CHAR_W / 2, s.legLeftY * CHAR_H - CHAR_H / 2, s.legLeftW * CHAR_W, s.legLeftH * CHAR_H, s.legRadius * CHAR_W);
    g.fillRoundedRect(s.legRightX * CHAR_W - CHAR_W / 2, s.legRightY * CHAR_H - CHAR_H / 2, s.legRightW * CHAR_W, s.legRightH * CHAR_H, s.legRadius * CHAR_W);
  }

  /** Show a painted texture (canvas or base64-backed) clipped to the body box. */
  setPaintTexture(key: string): void {
    if (!this.paintImg) {
      this.paintImg = this.scene.add.image(0, 0, key).setDisplaySize(CHAR_W, CHAR_H);
      this.addAt(this.paintImg, 2); // above bodyGfx, below label
    } else if (this.paintImg.texture.key !== key) {
      this.paintImg.setTexture(key).setDisplaySize(CHAR_W, CHAR_H);
    }
  }

  setRing(color: number | null, you: boolean): void {
    const g = this.ring;
    g.clear();
    if (color === null && !you) return;
    const c = color ?? Palette.accent2;
    g.lineStyle(you ? 5 : 3, c, you ? 1 : 0.7);
    g.strokeRoundedRect(-CHAR_W / 2 - 7, -CHAR_H / 2 - 5, CHAR_W + 14, CHAR_H + 12, 20);
  }

  setPose(pose: number): void {
    const idx = ((pose % POSE_ROTATION.length) + POSE_ROTATION.length) % POSE_ROTATION.length;
    this.setRotation(POSE_ROTATION[idx]!);
    this.scaleX = POSE_FLIP[idx]!;
  }

  setPlayerName(name: string): void {
    this.label.setText(name);
  }

  setFound(found: boolean): void {
    this.bodyGfx.setAlpha(found ? 0.55 : 1);
    this.paintImg?.setAlpha(found ? 0.55 : 1);
    if (found && !this.foundMark) {
      this.foundMark = this.scene.add.text(0, -CHAR_H / 2 - 18, '💥', { fontSize: '26px' }).setOrigin(0.5);
      this.add(this.foundMark);
    } else if (!found && this.foundMark) {
      this.foundMark.destroy();
      this.foundMark = null;
    }
  }

  setLabelVisible(visible: boolean): void {
    this.label.setVisible(visible);
  }
}
