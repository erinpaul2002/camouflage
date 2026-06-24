import { el } from '../ui/dom.js';
import { moveInput, resetMoveInput } from './inputState.js';

const RADIUS = 52;

/**
 * On-screen thumbstick for touch movement (used by the seeker during seek, where taps fire).
 * Writes a normalized vector to the shared `moveInput`.
 */
export class Joystick {
  readonly el: HTMLElement;
  private readonly knob: HTMLElement;
  private pointerId = -1;
  private originX = 0;
  private originY = 0;

  constructor() {
    this.knob = el('div', { className: 'bq-stick-knob' });
    this.el = el('div', { className: 'bq-stick' }, [this.knob]);
    this.el.addEventListener('pointerdown', (e) => this.onDown(e));
    this.el.addEventListener('pointermove', (e) => this.onMove(e));
    const up = (e: PointerEvent): void => this.onUp(e);
    this.el.addEventListener('pointerup', up);
    this.el.addEventListener('pointercancel', up);
  }

  private onDown(e: PointerEvent): void {
    e.preventDefault();
    this.pointerId = e.pointerId;
    const rect = this.el.getBoundingClientRect();
    this.originX = rect.left + rect.width / 2;
    this.originY = rect.top + rect.height / 2;
    this.el.setPointerCapture(e.pointerId);
    this.update(e);
  }

  private onMove(e: PointerEvent): void {
    if (e.pointerId !== this.pointerId) return;
    this.update(e);
  }

  private onUp(e: PointerEvent): void {
    if (e.pointerId !== this.pointerId) return;
    this.pointerId = -1;
    this.knob.style.transform = 'translate(0px, 0px)';
    resetMoveInput();
  }

  private update(e: PointerEvent): void {
    const rawX = e.clientX - this.originX;
    const rawY = e.clientY - this.originY;
    const dist = Math.hypot(rawX, rawY);
    const dirX = dist > 0 ? rawX / dist : 0;
    const dirY = dist > 0 ? rawY / dist : 0;
    const clamped = Math.min(dist, RADIUS);
    this.knob.style.transform = `translate(${dirX * clamped}px, ${dirY * clamped}px)`;
    const mag = clamped / RADIUS;
    moveInput.x = dirX * mag;
    moveInput.y = dirY * mag;
    moveInput.active = mag > 0.08;
  }

  destroy(): void {
    resetMoveInput();
    this.el.remove();
  }
}
