import Phaser from 'phaser';
import { BOARD_HEIGHT, BOARD_WIDTH, type EnvironmentId } from '@blendquest/shared';
import { ENV_PALETTES } from './palettes.js';

const ENV_KEY = 'bq-env-layer';
const W = BOARD_WIDTH;
const H = BOARD_HEIGHT;

type Rng = Phaser.Math.RandomDataGenerator;

/**
 * Draw a rich, deterministic procedural environment (ADR-006 / F10). Each theme layers
 * a gradient base + characteristic detail so players get real blending opportunities.
 * Seeded by environment id, so every client renders the identical scene.
 */
export function drawEnvironment(scene: Phaser.Scene, envId: EnvironmentId): void {
  scene.children.getByName(ENV_KEY)?.destroy();
  const g = scene.add.graphics();
  g.name = ENV_KEY;
  g.setDepth(-100);

  const pal = ENV_PALETTES[envId];
  gradient(g, pal.top, pal.bottom);

  const rng = new Phaser.Math.RandomDataGenerator([envId]);
  const detail: Record<EnvironmentId, (g: Phaser.GameObjects.Graphics, rng: Rng) => void> = {
    forest,
    underwater,
    candy,
    urban,
    abstract,
  };
  detail[envId](g, rng);
}

function gradient(g: Phaser.GameObjects.Graphics, top: number, bottom: number): void {
  const bands = 64;
  const c0 = Phaser.Display.Color.IntegerToColor(top);
  const c1 = Phaser.Display.Color.IntegerToColor(bottom);
  for (let i = 0; i < bands; i++) {
    const c = Phaser.Display.Color.Interpolate.ColorWithColor(c0, c1, bands, i);
    g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1);
    g.fillRect(0, Math.floor((i / bands) * H), W, Math.ceil(H / bands) + 1);
  }
}

function blob(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, color: number, alpha: number): void {
  g.fillStyle(color, alpha);
  g.fillCircle(x, y, r);
}

// ── Themes ───────────────────────────────────────────────────────────────────

function forest(g: Phaser.GameObjects.Graphics, rng: Rng): void {
  // ground
  g.fillStyle(0x2f6b2f, 1);
  g.fillRect(0, H * 0.72, W, H * 0.28);
  // bushes
  for (let i = 0; i < 12; i++) {
    const x = rng.between(0, W);
    const y = H * (0.72 + rng.realInRange(0, 0.2));
    const r = rng.between(40, 90);
    blob(g, x, y, r, 0x3f8a3f, 0.9);
    blob(g, x - r * 0.5, y + 6, r * 0.7, 0x357a35, 0.9);
  }
  // trees
  for (let i = 0; i < 7; i++) {
    const x = rng.between(60, W - 60);
    const baseY = H * rng.realInRange(0.55, 0.75);
    g.fillStyle(0x6b4a2b, 1);
    g.fillRect(x - 12, baseY, 24, H - baseY);
    for (let j = 0; j < 4; j++) {
      const fy = baseY - j * 46;
      blob(g, x, fy, 70 - j * 6, j % 2 ? 0x4ea84e : 0x6cc24a, 0.95);
    }
  }
  // sun rays / leaves
  for (let i = 0; i < 30; i++) {
    blob(g, rng.between(0, W), rng.between(0, H * 0.6), rng.between(6, 16), 0x9be36b, rng.realInRange(0.1, 0.3));
  }
}

function underwater(g: Phaser.GameObjects.Graphics, rng: Rng): void {
  // light rays
  for (let i = 0; i < 6; i++) {
    const x = rng.between(0, W);
    g.fillStyle(0xbdf0ff, 0.06);
    g.fillTriangle(x, 0, x - 80, H, x + 140, H);
  }
  // seabed
  g.fillStyle(0x0e4f7a, 1);
  g.fillRect(0, H * 0.82, W, H * 0.18);
  // seaweed
  for (let i = 0; i < 16; i++) {
    const x = rng.between(0, W);
    g.fillStyle(0x1f9e6e, 0.9);
    for (let s = 0; s < 6; s++) {
      blob(g, x + Math.sin(s) * 12, H - 20 - s * 26, 12, 0x1f9e6e, 0.85);
    }
  }
  // coral + fish
  for (let i = 0; i < 8; i++) blob(g, rng.between(0, W), H * rng.realInRange(0.8, 0.96), rng.between(20, 44), 0xff8fab, 0.8);
  for (let i = 0; i < 10; i++) {
    const x = rng.between(0, W);
    const y = rng.between(60, H * 0.7);
    g.fillStyle(0xffe27a, 0.85);
    g.fillTriangle(x, y, x - 26, y - 12, x - 26, y + 12);
    blob(g, x - 8, y, 14, 0xffe27a, 0.85);
  }
  // bubbles
  for (let i = 0; i < 40; i++) {
    g.lineStyle(2, 0xffffff, rng.realInRange(0.1, 0.35));
    g.strokeCircle(rng.between(0, W), rng.between(0, H), rng.between(4, 14));
  }
}

function candy(g: Phaser.GameObjects.Graphics, rng: Rng): void {
  // diagonal cream stripes
  for (let i = -8; i < 24; i++) {
    g.fillStyle(0xfff3b0, 0.18);
    const x = i * 80;
    g.fillTriangle(x, 0, x + 40, 0, x + 40 - H, H);
  }
  // gumdrops
  for (let i = 0; i < 14; i++) {
    const c = [0xff9ec4, 0xc77dff, 0x9be36b, 0xffe27a][i % 4]!;
    blob(g, rng.between(0, W), rng.between(40, H - 40), rng.between(26, 60), c, 0.9);
  }
  // lollipops
  for (let i = 0; i < 6; i++) {
    const x = rng.between(60, W - 60);
    const y = rng.between(80, H - 160);
    g.fillStyle(0xffffff, 0.8);
    g.fillRect(x - 4, y, 8, 150);
    blob(g, x, y, 40, 0xff7eb3, 0.95);
    blob(g, x, y, 22, 0xfff3b0, 0.9);
  }
  // sprinkles
  for (let i = 0; i < 60; i++) {
    const c = [0xff4d8d, 0x4dd4ff, 0xffd23f, 0x7cff6b][i % 4]!;
    blob(g, rng.between(0, W), rng.between(0, H), rng.between(3, 6), c, 0.8);
  }
}

function urban(g: Phaser.GameObjects.Graphics, rng: Rng): void {
  // brick wall
  const bw = 96;
  const bh = 44;
  for (let row = 0; row * bh < H; row++) {
    const offset = row % 2 ? bw / 2 : 0;
    for (let col = -1; col * bw < W; col++) {
      const x = col * bw + offset;
      const y = row * bh;
      const shade = 0x3a3f52 + rng.between(0, 0x101010);
      g.fillStyle(shade, 1);
      g.fillRect(x + 2, y + 2, bw - 4, bh - 4);
    }
  }
  // graffiti splashes
  for (let i = 0; i < 10; i++) {
    const x = rng.between(80, W - 80);
    const y = rng.between(80, H - 80);
    const c = [0xff4d8d, 0x4dd4ff, 0xffd23f, 0x7cff6b, 0xc77dff][i % 5]!;
    for (let j = 0; j < 6; j++) {
      blob(g, x + rng.between(-50, 50), y + rng.between(-40, 40), rng.between(18, 46), c, 0.7);
    }
  }
  // drips
  for (let i = 0; i < 18; i++) {
    const x = rng.between(0, W);
    const y = rng.between(0, H * 0.7);
    g.fillStyle([0xff4d8d, 0x4dd4ff, 0xffd23f][i % 3]!, 0.6);
    g.fillRect(x, y, 6, rng.between(20, 80));
  }
}

function abstract(g: Phaser.GameObjects.Graphics, rng: Rng): void {
  const colors = [0xff4d8d, 0x4dd4ff, 0xffd23f, 0x7cff6b, 0xc77dff, 0xff9f45];
  for (let i = 0; i < 22; i++) {
    const c = colors[i % colors.length]!;
    const x = rng.between(0, W);
    const y = rng.between(0, H);
    const r = rng.between(40, 140);
    const kind = rng.between(0, 2);
    if (kind === 0) blob(g, x, y, r, c, 0.5);
    else if (kind === 1) {
      g.fillStyle(c, 0.5);
      g.fillTriangle(x, y - r, x - r, y + r, x + r, y + r);
    } else {
      g.fillStyle(c, 0.45);
      g.fillRoundedRect(x - r, y - r / 2, r * 2, r, 20);
    }
  }
  // stripes
  for (let i = 0; i < 8; i++) {
    g.fillStyle(colors[i % colors.length]!, 0.12);
    g.fillRect(0, (i / 8) * H, W, 14);
  }
}
