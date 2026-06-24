/**
 * Env-driven server config (TECH_DESIGN §13). No hardcoded secrets/origins —
 * everything overridable via environment variables.
 */
import { TICK_HZ } from '@blendquest/shared';

function num(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export interface ServerConfig {
  port: number;
  corsOrigin: string;
  tickHz: number;
}

export function loadConfig(): ServerConfig {
  return {
    port: num('PORT', 3001),
    corsOrigin: process.env.CORS_ORIGIN?.trim() || 'http://localhost:5173',
    tickHz: num('TICK_HZ', TICK_HZ),
  };
}
