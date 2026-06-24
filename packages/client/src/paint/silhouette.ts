/**
 * The shared humanoid silhouette (PRD §4.2). Used by the paint buffer (to clip strokes to
 * the body shape), the studio guide, and the on-board character — so paint always lines up
 * with the white base. Proportions are expressed as ratios of the canvas/sprite box.
 */
export const SILHOUETTE = {
  headCx: 0.5,
  headCy: 0.18,
  headR: 0.22,

  torsoX: 0.25,
  torsoY: 0.3,
  torsoW: 0.5,
  torsoH: 0.45,
  torsoRadius: 0.15,

  armLeftX: 0.08,
  armLeftY: 0.35,
  armLeftW: 0.18,
  armLeftH: 0.38,
  armRadius: 0.09,

  armRightX: 0.74,
  armRightY: 0.35,
  armRightW: 0.18,
  armRightH: 0.38,

  legLeftX: 0.28,
  legLeftY: 0.65,
  legLeftW: 0.18,
  legLeftH: 0.32,
  legRadius: 0.09,

  legRightX: 0.54,
  legRightY: 0.65,
  legRightW: 0.18,
  legRightH: 0.32,
} as const;

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** Trace the humanoid (head + torso + limbs) into the current 2D path for `w`×`h`. */
export function traceHumanoid(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const s = SILHOUETTE;
  ctx.beginPath();
  
  // Head
  ctx.arc(s.headCx * w, s.headCy * h, s.headR * w, 0, Math.PI * 2);
  
  // Torso
  roundRectPath(ctx, s.torsoX * w, s.torsoY * h, s.torsoW * w, s.torsoH * h, s.torsoRadius * w);
  
  // Arms
  roundRectPath(ctx, s.armLeftX * w, s.armLeftY * h, s.armLeftW * w, s.armLeftH * h, s.armRadius * w);
  roundRectPath(ctx, s.armRightX * w, s.armRightY * h, s.armRightW * w, s.armRightH * h, s.armRadius * w);
  
  // Legs
  roundRectPath(ctx, s.legLeftX * w, s.legLeftY * h, s.legLeftW * w, s.legLeftH * h, s.legRadius * w);
  roundRectPath(ctx, s.legRightX * w, s.legRightY * h, s.legRightW * w, s.legRightH * h, s.legRadius * w);
}
