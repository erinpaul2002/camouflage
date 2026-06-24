/**
 * Cartoon visual direction for BlendQuest (one UI style — playful/cartoon, logged in
 * DECISIONS). Central palette + type so every scene stays on-brand.
 */
export const Palette = {
  bgDeep: 0x141432,
  bgPanel: 0x1f1f4a,
  bgPanelLight: 0x2a2a63,
  ink: 0xffffff,
  inkSoft: 0xb9b9e6,
  accent: 0xff4d8d, // hot pink
  accent2: 0x4dd4ff, // cyan
  accent3: 0xffd23f, // sunny yellow
  good: 0x7cff6b,
  bad: 0xff5a5a,
  hider: 0x4dd4ff,
  seeker: 0xff4d8d,
} as const;

export const PaletteCss = {
  accent: '#ff4d8d',
  accent2: '#4dd4ff',
  accent3: '#ffd23f',
  ink: '#ffffff',
  inkSoft: '#b9b9e6',
} as const;

export const Fonts = {
  display: '"Baloo 2", "Trebuchet MS", system-ui, sans-serif',
  body: '"Nunito", system-ui, sans-serif',
} as const;
