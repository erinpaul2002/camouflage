import { describe, expect, it } from 'vitest';
import { stripDataUrlPrefix, strokePoints, toDataUrl } from './stroke.js';

describe('strokePoints', () => {
  it('returns at least the endpoint for a short move', () => {
    const pts = strokePoints({ x: 0, y: 0 }, { x: 1, y: 0 }, 4);
    expect(pts[pts.length - 1]).toEqual({ x: 1, y: 0 });
  });

  it('fills evenly-spaced points along a long drag', () => {
    const pts = strokePoints({ x: 0, y: 0 }, { x: 40, y: 0 }, 4);
    expect(pts.length).toBe(10);
    expect(pts[0]!.x).toBeCloseTo(4);
    expect(pts[9]!.x).toBeCloseTo(40);
  });

  it('handles a zero-length move without dividing by zero', () => {
    const pts = strokePoints({ x: 5, y: 5 }, { x: 5, y: 5 }, 4);
    expect(pts).toEqual([{ x: 5, y: 5 }]);
  });
});

describe('data url helpers', () => {
  it('strips the data-url prefix to the base64 body', () => {
    expect(stripDataUrlPrefix('data:image/png;base64,AAAB')).toBe('AAAB');
    expect(stripDataUrlPrefix('AAAB')).toBe('AAAB');
  });
  it('round-trips a base64 body back to a data url', () => {
    expect(toDataUrl('AAAB')).toBe('data:image/png;base64,AAAB');
    expect(stripDataUrlPrefix(toDataUrl('XYZ'))).toBe('XYZ');
  });
});
