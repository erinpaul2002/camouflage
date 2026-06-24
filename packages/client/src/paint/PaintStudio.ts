/**
 * The hider's prep paint studio (F7/F8): a docked panel to paint the character. Brush,
 * eraser, eyedropper (samples the environment backdrop), color picker + environment swatches,
 * size/opacity, clear, and preset poses. The character canvas sits over a live render of the
 * room's environment so you can paint to blend in.
 */
import {
  CHARACTER_CANVAS_HEIGHT,
  CHARACTER_CANVAS_WIDTH,
  POSE_COUNT,
  type EnvironmentId,
} from '@blendquest/shared';
import type { NetClient } from '../net/NetClient.js';
import { el } from '../ui/dom.js';
import { audio } from '../audio/audio.js';
import { createEnvironmentCanvas } from '../environments/canvas2d.js';
import { ENV_PALETTES } from '../environments/palettes.js';
import { traceHumanoid } from './silhouette.js';
import type { PaintBuffer } from './PaintBuffer.js';

type ToolMode = 'brush' | 'eyedropper';

export class PaintStudio {
  readonly el: HTMLElement;
  private readonly envCanvas: HTMLCanvasElement;
  private readonly fullBgCanvas: HTMLCanvasElement;
  private readonly stage: HTMLElement;
  private readonly colorInput: HTMLInputElement;
  private mode: ToolMode = 'brush';
  private painting = false;
  private lastBrushSfx = 0;
  private readonly toolButtons: Record<ToolMode, HTMLButtonElement>;
  private readonly poseButtons: HTMLButtonElement[] = [];

  constructor(
    private readonly buffer: PaintBuffer,
    envId: EnvironmentId,
    private readonly net: NetClient,
  ) {
    // ── Paint stage: env backdrop + guide outline + the live paint canvas ──
    this.fullBgCanvas = createEnvironmentCanvas(envId);
    
    this.envCanvas = el('canvas', { className: 'bq-paint-canvas' });
    this.envCanvas.width = CHARACTER_CANVAS_WIDTH;
    this.envCanvas.height = CHARACTER_CANVAS_HEIGHT;

    const guide = el('canvas', { className: 'bq-paint-canvas guide' });
    guide.width = CHARACTER_CANVAS_WIDTH;
    guide.height = CHARACTER_CANVAS_HEIGHT;
    this.drawGuide(guide);

    this.buffer.canvas.className = 'bq-paint-canvas';
    this.stage = el('div', { className: 'bq-paint-stage' }, [this.envCanvas, this.buffer.canvas, guide]);
    this.bindPointer();

    // ── Tools ──
    this.colorInput = el('input', { type: 'color', className: 'bq-color', value: this.buffer.getColor() });
    this.colorInput.addEventListener('input', () => this.buffer.setColor(this.colorInput.value));

    this.toolButtons = {
      brush: this.toolBtn('🖌️', 'brush'),
      eyedropper: this.toolBtn('💧', 'eyedropper'),
    };
    this.setMode('brush');

    const size = this.slider(6, 56, this.buffer.getSize(), (v) => this.buffer.setSize(v));
    const opacity = this.slider(10, 100, this.buffer.getOpacity() * 100, (v) => this.buffer.setOpacity(v / 100));
    const clearBtn = el('button', { className: 'bq-tool', text: 'Clear', onClick: () => this.buffer.clear() });

    this.el = el('div', { className: 'bq-studio' }, [
      el('div', { className: 'bq-studio-title', text: 'Paint to blend in' }),
      this.stage,
      el('div', { className: 'bq-swatches' }, this.swatches(envId)),
      el('div', { className: 'bq-tool-row' }, [
        this.toolButtons.brush,
        this.toolButtons.eyedropper,
        this.colorInput,
        clearBtn,
      ]),
      el('div', { className: 'bq-slider-row' }, [el('span', { text: 'Size' }), size]),
      el('div', { className: 'bq-slider-row' }, [el('span', { text: 'Fade' }), opacity]),
      el('div', { className: 'bq-pose-row' }, this.poses()),
    ]);
  }

  private toolBtn(label: string, mode: ToolMode): HTMLButtonElement {
    return el('button', { className: 'bq-tool', text: label, onClick: () => this.setMode(mode) });
  }

  private setMode(mode: ToolMode): void {
    this.mode = mode;
    if (mode === 'brush') this.buffer.setTool(mode);
    for (const [m, btn] of Object.entries(this.toolButtons)) {
      btn.classList.toggle('active', m === mode);
    }
  }

  private slider(min: number, max: number, value: number, onChange: (v: number) => void): HTMLInputElement {
    const input = el('input', { type: 'range', className: 'bq-range', min, max, value: Math.round(value) });
    input.addEventListener('input', () => onChange(Number(input.value)));
    return input;
  }

  private swatches(envId: EnvironmentId): HTMLElement[] {
    const pal = ENV_PALETTES[envId];
    const colors = [pal.top, pal.bottom, ...pal.accents];
    return colors.map((c) => {
      const hex = '#' + c.toString(16).padStart(6, '0');
      return el('button', {
        className: 'bq-swatch',
        style: `background:${hex}`,
        title: 'Environment color',
        onClick: () => this.pickColor(hex),
      });
    });
  }

  private poses(): HTMLElement[] {
    for (let i = 0; i < POSE_COUNT; i++) {
      const btn = el('button', { className: 'bq-tool pose', text: `${i + 1}`, onClick: () => this.setPose(i) });
      this.poseButtons.push(btn);
    }
    this.poseButtons[0]?.classList.add('active');
    return [el('span', { text: 'Pose', className: 'bq-pose-label' }), ...this.poseButtons];
  }

  private setPose(pose: number): void {
    this.poseButtons.forEach((b, i) => b.classList.toggle('active', i === pose));
    this.net.setPose({ pose });
  }

  private pickColor(hex: string): void {
    this.buffer.setColor(hex);
    this.colorInput.value = hex;
    if (this.mode === 'eyedropper') this.setMode('brush');
  }

  private drawGuide(canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext('2d')!;
    traceHumanoid(ctx, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fill();
  }

  private bindPointer(): void {
    const toBuffer = (e: PointerEvent) => {
      const rect = this.stage.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * CHARACTER_CANVAS_WIDTH;
      const y = ((e.clientY - rect.top) / rect.height) * CHARACTER_CANVAS_HEIGHT;
      return { x, y };
    };

    this.stage.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      audio.resume();
      const p = toBuffer(e);
      if (this.mode === 'eyedropper') {
        this.sampleAt(p.x, p.y);
        return;
      }
      this.painting = true;
      this.stage.setPointerCapture(e.pointerId);
      this.buffer.begin(p);
      this.brushSound();
    });
    this.stage.addEventListener('pointermove', (e) => {
      if (!this.painting) return;
      this.buffer.drawTo(toBuffer(e));
      this.brushSound();
    });
    const stop = (e: PointerEvent) => {
      if (!this.painting) return;
      this.painting = false;
      this.buffer.end();
      if (this.stage.hasPointerCapture(e.pointerId)) this.stage.releasePointerCapture(e.pointerId);
    };
    this.stage.addEventListener('pointerup', stop);
    this.stage.addEventListener('pointercancel', stop);
  }

  private brushSound(): void {
    if (this.mode !== 'brush') return;
    const now = performance.now();
    if (now - this.lastBrushSfx < 110) return;
    this.lastBrushSfx = now;
    audio.sfx('brush');
  }

  private sampleAt(x: number, y: number): void {
    const ctx = this.envCanvas.getContext('2d')!;
    const d = ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
    const hex =
      '#' +
      [d[0], d[1], d[2]]
        .map((n) => (n ?? 0).toString(16).padStart(2, '0'))
        .join('');
    this.pickColor(hex);
  }

  destroy(): void {
    this.buffer.canvas.className = '';
  }

  updateBg(x: number, y: number): void {
    const ctx = this.envCanvas.getContext('2d')!;
    const w = this.envCanvas.width;
    const h = this.envCanvas.height;
    
    // Character Sprite on the board is 60x84, centered on (x,y).
    // The paint canvas is 192x256. To match what the painted texture will look
    // like against the background, we must sample the 60x84 region from the
    // full board background and scale it up to 192x256.
    const CHAR_W = 60;
    const CHAR_H = 84;
    
    const srcX = x - CHAR_W / 2;
    const srcY = y - CHAR_H / 2;

    const sx = Math.max(0, srcX);
    const sy = Math.max(0, srcY);
    
    const clipX = sx - srcX;
    const clipY = sy - srcY;
    
    const sw = Math.min(CHAR_W - clipX, this.fullBgCanvas.width - sx);
    const sh = Math.min(CHAR_H - clipY, this.fullBgCanvas.height - sy);
    
    const dx = clipX * (w / CHAR_W);
    const dy = clipY * (h / CHAR_H);
    const dw = sw * (w / CHAR_W);
    const dh = sh * (h / CHAR_H);
    
    ctx.clearRect(0, 0, w, h);
    if (sw > 0 && sh > 0) {
      ctx.drawImage(this.fullBgCanvas, sx, sy, sw, sh, dx, dy, dw, dh);
    }
  }
}
