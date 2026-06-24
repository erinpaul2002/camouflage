/**
 * The local player's paint surface: an offscreen HTML5 canvas (ADR-007) clipped to the
 * humanoid silhouette so strokes never spill outside the body. Brush = round dabs along the
 * drag path; eraser = destination-out. Serializes to a base64 PNG body for `paint_commit`.
 */
import { CHARACTER_CANVAS_HEIGHT, CHARACTER_CANVAS_WIDTH } from '@blendquest/shared';
import { strokePoints, stripDataUrlPrefix, type Pt } from './stroke.js';
import { traceHumanoid } from './silhouette.js';

export type Tool = 'brush';

export class PaintBuffer {
  readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private tool: Tool = 'brush';
  private color = '#ff4d8d';
  private size = 26;
  private opacity = 1;
  private last: Pt | null = null;
  /** Bumps on every change so the renderer knows when to refresh the texture. */
  version = 0;
  painted = false;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = CHARACTER_CANVAS_WIDTH;
    this.canvas.height = CHARACTER_CANVAS_HEIGHT;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas context unavailable');
    this.ctx = ctx;
    // Permanent clip to the humanoid silhouette (set once, never restored).
    traceHumanoid(this.ctx, this.canvas.width, this.canvas.height);
    this.ctx.clip();
  }

  setTool(tool: Tool): void {
    this.tool = tool;
  }
  setColor(color: string): void {
    this.color = color;
  }
  setSize(size: number): void {
    this.size = size;
  }
  setOpacity(opacity: number): void {
    this.opacity = opacity;
  }
  getTool(): Tool {
    return this.tool;
  }
  getColor(): string {
    return this.color;
  }
  getSize(): number {
    return this.size;
  }
  getOpacity(): number {
    return this.opacity;
  }

  begin(pt: Pt): void {
    this.last = pt;
    this.dab(pt);
    this.bump();
  }

  drawTo(pt: Pt): void {
    if (!this.last) return this.begin(pt);
    for (const p of strokePoints(this.last, pt, Math.max(1, this.size * 0.22))) this.dab(p);
    this.last = pt;
    this.bump();
  }

  end(): void {
    this.last = null;
  }

  clear(): void {
    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.restore();
    this.painted = false;
    this.bump();
  }

  toBase64(): string {
    return stripDataUrlPrefix(this.canvas.toDataURL('image/png'));
  }

  private dab(p: Pt): void {
    const ctx = this.ctx;
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = this.opacity;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, this.size / 2, 0, Math.PI * 2);
    ctx.fill();
    if (this.tool === 'brush') this.painted = true;
  }

  private bump(): void {
    this.version++;
  }
}
