import type { EnvironmentId } from '@blendquest/shared';

/** Per-environment color identity. Also feeds the eyedropper sampling (F8, Phase 3). */
export interface EnvPalette {
  name: string;
  top: number;
  bottom: number;
  accents: number[];
}

export const ENV_PALETTES: Record<EnvironmentId, EnvPalette> = {
  forest: { name: 'Forest', top: 0x9be36b, bottom: 0x2f6b2f, accents: [0x3f8a3f, 0x6cc24a, 0x215c21, 0x8b5a2b] },
  underwater: { name: 'Underwater', top: 0x4dd4ff, bottom: 0x0a3a6b, accents: [0x1f7fb0, 0x36c5e0, 0x0e5b8a, 0xffe27a] },
  candy: { name: 'Candy', top: 0xffd1ef, bottom: 0xff7eb3, accents: [0xfff3b0, 0xff9ec4, 0xc77dff, 0x9be36b] },
  urban: { name: 'Urban', top: 0x5a6480, bottom: 0x222633, accents: [0xff4d8d, 0x4dd4ff, 0xffd23f, 0x7cff6b] },
  abstract: { name: 'Abstract', top: 0x2a2a63, bottom: 0x141432, accents: [0xff4d8d, 0x4dd4ff, 0xffd23f, 0x7cff6b] },
};
