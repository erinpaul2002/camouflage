# BlendQuest

A 2D browser-based multiplayer **hide & paint** party game. Players paint their characters
to blend into colorful environments, then play hide-and-seek — seekers hunt hiders with a
paintball gun. 3–8 players, rounds of 3–5 minutes, no downloads.

See [docs/PRD.md](docs/PRD.md), [docs/FEATURES.md](docs/FEATURES.md), and
[docs/TECH_DESIGN.md](docs/TECH_DESIGN.md). Build orchestration lives in [AGENTS.md](AGENTS.md);
running history in [agent-brain/](agent-brain/).

## Stack

TypeScript · Phaser 3 · Socket.io · Vite · Vitest · Playwright — npm workspaces monorepo.

| Package | Role |
|---|---|
| `packages/shared` | Wire protocol, types, constants, zod validation (the contract) |
| `packages/server` | Authoritative Node + Socket.io room server (pure engine + net layer) |
| `packages/client` | Phaser 3 client + DOM overlay UI |

## Getting started

```bash
npm install

# run server (:3001) and client (:5173) together
npm run dev

# or individually
npm run dev:server
npm run dev:client
```

Open http://localhost:5173, create a room, and share the code. Open more browser tabs to
join with the code and start a game (needs 3+ players).

## Scripts

```bash
npm test          # Vitest (engine + net integration)
npm run coverage  # coverage report
npm run lint      # ESLint
npm run typecheck # tsc -b across packages
npm run build     # build all packages
```

## Configuration

Server reads env vars (no hardcoded secrets): `PORT` (3001), `CORS_ORIGIN`
(http://localhost:5173), `TICK_HZ` (12). Client reads `VITE_SERVER_URL`
(http://localhost:3001).

## Status

- ✅ **Phase 0** — monorepo scaffold, build/test/lint/CI gates
- ✅ **Phase 1** — rooms (create/join by code), lobby, host start, role assignment + reveal
- ✅ **Phase 2** — phase state machine, server-authoritative timers, movement sync (predict + interpolate), HUD, scoreboard
- ⏳ Phases 3–7 — painting, environments, seek/scoring, polish, perf
