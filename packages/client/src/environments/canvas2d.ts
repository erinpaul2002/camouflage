/**
 * 2D-canvas render of an environment, mirroring the Phaser version (same ENV_PALETTES +
 * deterministic layout). Used as the paint studio backdrop and as the eyedropper's sampling
 * source so the eyedropper truly picks colors from the background (F8).
 */
import Phaser from 'phaser';
import { BOARD_HEIGHT, BOARD_WIDTH, type EnvironmentId } from '@blendquest/shared';
import { ENV_PALETTES } from './palettes.js';

type Rng = Phaser.Math.RandomDataGenerator;
const W = BOARD_WIDTH;
const H = BOARD_HEIGHT;

function rgba(color: number, alpha: number): string {
  return `rgba(${(color >> 16) & 0xff}, ${(color >> 8) & 0xff}, ${color & 0xff}, ${alpha})`;
}

export function createEnvironmentCanvas(envId: EnvironmentId): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  const pal = ENV_PALETTES[envId];

  // gradient
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, rgba(pal.top, 1));
  grad.addColorStop(1, rgba(pal.bottom, 1));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  const rng = new Phaser.Math.RandomDataGenerator([envId]);
  
  if (envId === 'forest') forest(ctx, rng);
  else if (envId === 'underwater') underwater(ctx, rng);
  else if (envId === 'candy') candy(ctx, rng);
  else if (envId === 'urban') urban(ctx, rng);
  else abstract(ctx, rng);

  return canvas;
}

function blob(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: number, alpha: number) {
  ctx.fillStyle = rgba(color, alpha);
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}

function forest(ctx: CanvasRenderingContext2D, rng: Rng) {
  ctx.fillStyle = rgba(0x2f6b2f, 1);
  ctx.fillRect(0, H * 0.72, W, H * 0.28);
  for (let i = 0; i < 12; i++) {
    const x = rng.between(0, W);
    const y = H * (0.72 + rng.realInRange(0, 0.2));
    const r = rng.between(40, 90);
    blob(ctx, x, y, r, 0x3f8a3f, 0.9);
    blob(ctx, x - r * 0.5, y + 6, r * 0.7, 0x357a35, 0.9);
  }
  for (let i = 0; i < 7; i++) {
    const x = rng.between(60, W - 60);
    const baseY = H * rng.realInRange(0.55, 0.75);
    ctx.fillStyle = rgba(0x6b4a2b, 1);
    ctx.fillRect(x - 12, baseY, 24, H - baseY);
    for (let j = 0; j < 4; j++) {
      const fy = baseY - j * 46;
      blob(ctx, x, fy, 70 - j * 6, j % 2 ? 0x4ea84e : 0x6cc24a, 0.95);
    }
  }
  for (let i = 0; i < 30; i++) {
    blob(ctx, rng.between(0, W), rng.between(0, H * 0.6), rng.between(6, 16), 0x9be36b, rng.realInRange(0.1, 0.3));
  }
}

function underwater(ctx: CanvasRenderingContext2D, rng: Rng) {
  for (let i = 0; i < 6; i++) {
    const x = rng.between(0, W);
    ctx.fillStyle = rgba(0xbdf0ff, 0.06);
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x - 80, H); ctx.lineTo(x + 140, H); ctx.fill();
  }
  ctx.fillStyle = rgba(0x0e4f7a, 1);
  ctx.fillRect(0, H * 0.82, W, H * 0.18);
  for (let i = 0; i < 16; i++) {
    const x = rng.between(0, W);
    ctx.fillStyle = rgba(0x1f9e6e, 0.9);
    for (let s = 0; s < 6; s++) {
      blob(ctx, x + Math.sin(s) * 12, H - 20 - s * 26, 12, 0x1f9e6e, 0.85);
    }
  }
  for (let i = 0; i < 8; i++) blob(ctx, rng.between(0, W), H * rng.realInRange(0.8, 0.96), rng.between(20, 44), 0xff8fab, 0.8);
  for (let i = 0; i < 10; i++) {
    const x = rng.between(0, W);
    const y = rng.between(60, H * 0.7);
    ctx.fillStyle = rgba(0xffe27a, 0.85);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 26, y - 12); ctx.lineTo(x - 26, y + 12); ctx.fill();
    blob(ctx, x - 8, y, 14, 0xffe27a, 0.85);
  }
  for (let i = 0; i < 40; i++) {
    ctx.lineWidth = 2;
    ctx.strokeStyle = rgba(0xffffff, rng.realInRange(0.1, 0.35));
    ctx.beginPath(); ctx.arc(rng.between(0, W), rng.between(0, H), rng.between(4, 14), 0, Math.PI * 2); ctx.stroke();
  }
}

function candy(ctx: CanvasRenderingContext2D, rng: Rng) {
  for (let i = -8; i < 24; i++) {
    ctx.fillStyle = rgba(0xfff3b0, 0.18);
    const x = i * 80;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 40, 0); ctx.lineTo(x + 40 - H, H); ctx.lineTo(x - H, H); ctx.fill();
  }
  for (let i = 0; i < 14; i++) {
    const c = [0xff9ec4, 0xc77dff, 0x9be36b, 0xffe27a][i % 4]!;
    blob(ctx, rng.between(0, W), rng.between(40, H - 40), rng.between(26, 60), c, 0.9);
  }
  for (let i = 0; i < 6; i++) {
    const x = rng.between(60, W - 60);
    const y = rng.between(80, H - 160);
    ctx.fillStyle = rgba(0xffffff, 0.8);
    ctx.fillRect(x - 4, y, 8, 150);
    blob(ctx, x, y, 40, 0xff7eb3, 0.95);
    blob(ctx, x, y, 22, 0xfff3b0, 0.9);
  }
  for (let i = 0; i < 60; i++) {
    const c = [0xff4d8d, 0x4dd4ff, 0xffd23f, 0x7cff6b][i % 4]!;
    blob(ctx, rng.between(0, W), rng.between(0, H), rng.between(3, 6), c, 0.8);
  }
}

function urban(ctx: CanvasRenderingContext2D, rng: Rng) {
  const bw = 96;
  const bh = 44;
  for (let row = 0; row * bh < H; row++) {
    const offset = row % 2 ? bw / 2 : 0;
    for (let col = -1; col * bw < W; col++) {
      const x = col * bw + offset;
      const y = row * bh;
      const shade = 0x3a3f52 + rng.between(0, 0x101010);
      ctx.fillStyle = rgba(shade, 1);
      ctx.fillRect(x + 2, y + 2, bw - 4, bh - 4);
    }
  }
  for (let i = 0; i < 10; i++) {
    const x = rng.between(80, W - 80);
    const y = rng.between(80, H - 80);
    const c = [0xff4d8d, 0x4dd4ff, 0xffd23f, 0x7cff6b, 0xc77dff][i % 5]!;
    for (let j = 0; j < 6; j++) {
      blob(ctx, x + rng.between(-50, 50), y + rng.between(-40, 40), rng.between(18, 46), c, 0.7);
    }
  }
  for (let i = 0; i < 18; i++) {
    const x = rng.between(0, W);
    const y = rng.between(0, H * 0.7);
    ctx.fillStyle = rgba([0xff4d8d, 0x4dd4ff, 0xffd23f][i % 3]!, 0.6);
    ctx.fillRect(x, y, 6, rng.between(20, 80));
  }
}

function abstract(ctx: CanvasRenderingContext2D, rng: Rng) {
  const colors = [0xff4d8d, 0x4dd4ff, 0xffd23f, 0x7cff6b, 0xc77dff, 0xff9f45];
  for (let i = 0; i < 22; i++) {
    const c = colors[i % colors.length]!;
    const x = rng.between(0, W);
    const y = rng.between(0, H);
    const r = rng.between(40, 140);
    const kind = rng.between(0, 2);
    if (kind === 0) blob(ctx, x, y, r, c, 0.5);
    else if (kind === 1) {
      ctx.fillStyle = rgba(c, 0.5);
      ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x - r, y + r); ctx.lineTo(x + r, y + r); ctx.fill();
    } else {
      ctx.fillStyle = rgba(c, 0.45);
      if (ctx.roundRect) {
        ctx.beginPath(); ctx.roundRect(x - r, y - r / 2, r * 2, r, 20); ctx.fill();
      } else {
        ctx.fillRect(x - r, y - r / 2, r * 2, r); // Fallback
      }
    }
  }
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = rgba(colors[i % colors.length]!, 0.12);
    ctx.fillRect(0, (i / 8) * H, W, 14);
  }
}
