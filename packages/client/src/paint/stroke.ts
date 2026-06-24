/** Pure paint helpers (no DOM) — unit-tested. */

export interface Pt {
  x: number;
  y: number;
}

/**
 * Interpolate evenly-spaced points from `from` → `to` so a dragged brush leaves a
 * continuous line instead of gaps between pointer samples.
 */
export function strokePoints(from: Pt, to: Pt, spacing: number): Pt[] {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.hypot(dx, dy);
  const step = Math.max(0.5, spacing);
  const steps = Math.max(1, Math.floor(dist / step));
  const pts: Pt[] = [];
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    pts.push({ x: from.x + dx * t, y: from.y + dy * t });
  }
  return pts;
}

/** Strip the `data:image/png;base64,` prefix, leaving just the base64 body for the wire. */
export function stripDataUrlPrefix(dataUrl: string): string {
  const comma = dataUrl.indexOf(',');
  return comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
}

/** Re-wrap a base64 body as a PNG data URL (for loading a synced blob into a texture). */
export function toDataUrl(base64Body: string, mime = 'image/png'): string {
  return `data:${mime};base64,${base64Body}`;
}
