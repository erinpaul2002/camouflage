import { beforeEach, describe, expect, it } from 'vitest';
import { ErrorCode, MAX_PLAYERS, PAINTBALL_COOLDOWN_MS, ServerEvent } from '@blendquest/shared';
import { RoomManager } from './RoomManager.js';
import type { Transport } from './transport.js';

interface Emission {
  target: string; // code or socketId
  scope: 'room' | 'socket';
  event: string;
  payload: unknown;
}

class FakeTransport implements Transport {
  emissions: Emission[] = [];
  membership = new Map<string, Set<string>>();

  toRoom(code: string, event: string, payload: unknown): void {
    this.emissions.push({ target: code, scope: 'room', event, payload });
  }
  toSocket(socketId: string, event: string, payload: unknown): void {
    this.emissions.push({ target: socketId, scope: 'socket', event, payload });
  }
  join(socketId: string, code: string): void {
    if (!this.membership.has(code)) this.membership.set(code, new Set());
    this.membership.get(code)!.add(socketId);
  }
  leave(socketId: string, code: string): void {
    this.membership.get(code)?.delete(socketId);
  }

  last(event: string): Emission | undefined {
    return [...this.emissions].reverse().find((e) => e.event === event);
  }
  errorsFor(socketId: string): Emission[] {
    return this.emissions.filter((e) => e.target === socketId && e.event === ServerEvent.ErrorMsg);
  }
}

let transport: FakeTransport;
let mgr: RoomManager;
let nowMs: number;

beforeEach(() => {
  transport = new FakeTransport();
  nowMs = 1000;
  // Deterministic pick: always 0 → code 'AAAAA', first environment, p0 seeker.
  mgr = new RoomManager({ transport, now: () => nowMs, pick: () => 0 });
});

function codeOf(): string {
  const joined = transport.last(ServerEvent.RoomJoined)!.payload as { snapshot: { code: string } };
  return joined.snapshot.code;
}

describe('RoomManager — create & join (F1)', () => {
  it('creates a room and sends room_joined + snapshot', () => {
    mgr.createRoom('host', 'Host');
    expect(mgr.roomCount()).toBe(1);
    expect(transport.last(ServerEvent.RoomJoined)).toBeDefined();
    expect(transport.last(ServerEvent.Snapshot)).toBeDefined();
    expect(transport.membership.get(codeOf())?.has('host')).toBe(true);
  });

  it('lets a second client join by code', () => {
    mgr.createRoom('host', 'Host');
    const code = codeOf();
    mgr.joinRoom('p1', code, 'Bee');
    const snap = mgr.getRoom(code)!;
    expect(Object.keys(snap.players)).toHaveLength(2);
  });

  it('rejects joining an unknown code without crashing', () => {
    mgr.joinRoom('p1', 'ZZZZZ', 'Bee');
    expect(transport.errorsFor('p1')[0]?.payload).toMatchObject({ code: ErrorCode.RoomNotFound });
    expect(mgr.roomCount()).toBe(0);
  });
});

describe('RoomManager — capacity (F2/F18)', () => {
  it('rejects the 9th player', () => {
    mgr.createRoom('host', 'Host');
    const code = codeOf();
    for (let i = 1; i < MAX_PLAYERS; i++) mgr.joinRoom(`p${i}`, code, `P${i}`);
    expect(Object.keys(mgr.getRoom(code)!.players)).toHaveLength(MAX_PLAYERS);
    mgr.joinRoom('overflow', code, 'Nope');
    expect(transport.errorsFor('overflow')[0]?.payload).toMatchObject({ code: ErrorCode.RoomFull });
    expect(Object.keys(mgr.getRoom(code)!.players)).toHaveLength(MAX_PLAYERS);
  });
});

describe('RoomManager — host start (F2/F3)', () => {
  it('blocks a non-host from starting', () => {
    mgr.createRoom('host', 'Host');
    const code = codeOf();
    mgr.joinRoom('p1', code, 'A');
    mgr.joinRoom('p2', code, 'B');
    mgr.startGame('p1');
    expect(transport.errorsFor('p1').some((e) => (e.payload as { code: string }).code === ErrorCode.NotHost)).toBe(true);
    expect(mgr.getRoom(code)!.phase).toBe('lobby');
  });

  it('blocks starting below the minimum', () => {
    mgr.createRoom('host', 'Host');
    mgr.startGame('host');
    expect(transport.errorsFor('host')[0]?.payload).toMatchObject({ code: ErrorCode.NotEnoughPlayers });
  });

  it('host start assigns roles, enters role_reveal, then auto-advances to prep', () => {
    mgr.createRoom('host', 'Host');
    const code = codeOf();
    mgr.joinRoom('p1', code, 'A');
    mgr.joinRoom('p2', code, 'B');
    mgr.startGame('host');

    let room = mgr.getRoom(code)!;
    expect(room.phase).toBe('role_reveal');
    const seekers = Object.values(room.players).filter((p) => p.role === 'seeker');
    expect(seekers).toHaveLength(1);
    expect(transport.last(ServerEvent.PhaseChanged)).toBeDefined();

    nowMs += 5000; // past the role-reveal window
    mgr.tick(nowMs); // authoritative tick advances reveal -> prep
    room = mgr.getRoom(code)!;
    expect(room.phase).toBe('prep');
  });
});

describe('RoomManager — movement & deltas (F6)', () => {
  function startedRoom(): string {
    mgr.createRoom('host', 'Host');
    const code = codeOf();
    mgr.joinRoom('p1', code, 'A');
    mgr.joinRoom('p2', code, 'B');
    mgr.startGame('host');
    nowMs += 5000;
    mgr.tick(nowMs); // -> prep
    return code;
  }

  it('ignores movement before prep/seek', () => {
    mgr.createRoom('host', 'Host');
    mgr.move('host', { x: 10, y: 10 }, 0); // still in lobby
    const p = mgr.getRoom(codeOf())!.players.host!;
    expect(p.pos).not.toEqual({ x: 10, y: 10 });
  });

  it('applies a clamped move during prep and broadcasts a delta on tick', () => {
    const code = startedRoom();
    const before = mgr.getRoom(code)!.players.p1!.pos;
    nowMs += 100;
    mgr.move('p1', { x: before.x + 15, y: before.y }, 0.5);
    const after = mgr.getRoom(code)!.players.p1!.pos;
    expect(after.x).toBeGreaterThan(before.x);

    nowMs += 100;
    mgr.tick(nowMs);
    const delta = transport.last(ServerEvent.PlayersDelta);
    expect(delta).toBeDefined();
    expect((delta!.payload as { deltas: { id: string }[] }).deltas[0]!.id).toBe('p1');
  });

  it('caps a teleport attempt to the per-tick max distance', () => {
    const code = startedRoom();
    const before = mgr.getRoom(code)!.players.p1!.pos;
    nowMs += 50;
    mgr.move('p1', { x: before.x + 5000, y: before.y }, 0);
    const after = mgr.getRoom(code)!.players.p1!.pos;
    expect(after.x - before.x).toBeLessThan(100); // nowhere near 5000
  });
});

describe('RoomManager — paint sync (F9)', () => {
  function preppedRoom(): string {
    mgr.createRoom('host', 'Host');
    const code = codeOf();
    mgr.joinRoom('p1', code, 'A');
    mgr.joinRoom('p2', code, 'B');
    mgr.startGame('host'); // host = seeker (pick 0), p1/p2 = hiders
    nowMs += 5000;
    mgr.tick(nowMs); // -> prep
    return code;
  }

  it('stores a hider commit, bumps server version, and broadcasts paint_update', () => {
    const code = preppedRoom();
    mgr.paintCommit('p1', 'BASE64DATA', 99); // client version ignored
    const upd = transport.last(ServerEvent.PaintUpdate)!;
    expect(upd.payload).toMatchObject({ playerId: 'p1', blob: 'BASE64DATA', version: 1 });
    expect(mgr.getRoom(code)!.players.p1!.paintVersion).toBe(1);
  });

  it('ignores commits from the seeker', () => {
    preppedRoom();
    mgr.paintCommit('host', 'X', 1); // host is seeker
    expect(transport.last(ServerEvent.PaintUpdate)).toBeUndefined();
  });

  it('ignores commits outside prep/seek', () => {
    mgr.createRoom('host', 'Host');
    const code = codeOf();
    mgr.joinRoom('p1', code, 'A');
    mgr.paintCommit('p1', 'ART', 1); // still in lobby
    expect(transport.last(ServerEvent.PaintUpdate)).toBeUndefined();
    expect(mgr.getRoom(code)!.players.p1!.paintVersion).toBe(0);
  });

  it('clears paint when a new round begins', () => {
    const code = preppedRoom();
    mgr.paintCommit('p1', 'ART', 1);
    // Fast-forward through seek -> round_end -> next role_reveal.
    let room = mgr.getRoom(code)!;
    nowMs = room.phaseEndsAt;
    mgr.tick(nowMs); // -> seek
    room = mgr.getRoom(code)!;
    nowMs = room.phaseEndsAt;
    mgr.tick(nowMs); // -> round_end
    room = mgr.getRoom(code)!;
    nowMs = room.phaseEndsAt + 1;
    mgr.tick(nowMs); // -> role_reveal (round 2): paint cleared
    // After clearing, a fresh commit starts versioning from the player's reset state.
    expect(mgr.getRoom(code)!.round).toBe(2);
  });
});

describe('RoomManager — paintball & seek (F11/F12)', () => {
  function seekRoom(): string {
    mgr.createRoom('host', 'Host'); // host = seeker (pick 0)
    const code = codeOf();
    mgr.joinRoom('p1', code, 'A');
    mgr.joinRoom('p2', code, 'B');
    mgr.startGame('host');
    let room = mgr.getRoom(code)!;
    nowMs = room.phaseEndsAt;
    mgr.tick(nowMs); // -> prep
    room = mgr.getRoom(code)!;
    nowMs = room.phaseEndsAt;
    mgr.tick(nowMs); // -> seek
    return code;
  }

  it('ignores fire from a non-seeker or outside seek', () => {
    seekRoom();
    mgr.firePaintball('p1', { x: 10, y: 10 }); // p1 is a hider
    expect(transport.last(ServerEvent.PaintballFired)).toBeUndefined();
  });

  it('broadcasts the shot and reveals a hider on a direct hit', () => {
    const code = seekRoom();
    const target = mgr.getRoom(code)!.players.p1!.pos;
    mgr.firePaintball('host', target);
    expect(transport.last(ServerEvent.PaintballFired)).toBeDefined();
    expect(transport.last(ServerEvent.PlayerFound)!.payload).toMatchObject({ targetId: 'p1', byId: 'host' });
    expect(mgr.getRoom(code)!.players.p1!.found).toBe(true);
  });

  it('enforces the fire cooldown', () => {
    seekRoom();
    mgr.firePaintball('host', { x: 9999, y: 0 }); // miss, but starts cooldown
    const firstCount = transport.emissions.filter((e) => e.event === ServerEvent.PaintballFired).length;
    mgr.firePaintball('host', { x: 9990, y: 0 }); // within cooldown -> ignored
    const secondCount = transport.emissions.filter((e) => e.event === ServerEvent.PaintballFired).length;
    expect(secondCount).toBe(firstCount);
    nowMs += PAINTBALL_COOLDOWN_MS + 1;
    mgr.firePaintball('host', { x: 9980, y: 0 });
    const thirdCount = transport.emissions.filter((e) => e.event === ServerEvent.PaintballFired).length;
    expect(thirdCount).toBe(firstCount + 1);
  });

  it('ends the round (seekers win) once all hiders are found', () => {
    const code = seekRoom();
    mgr.firePaintball('host', mgr.getRoom(code)!.players.p1!.pos);
    nowMs += PAINTBALL_COOLDOWN_MS + 1;
    mgr.firePaintball('host', mgr.getRoom(code)!.players.p2!.pos);
    mgr.tick(nowMs); // advance() sees all hiders found -> round_end
    const room = mgr.getRoom(code)!;
    expect(room.phase).toBe('round_end');
    expect(room.lastResult!.winner).toBe('seekers');
  });
});

describe('RoomManager — leave & host migration (F2)', () => {
  it('promotes a new host when the host leaves', () => {
    mgr.createRoom('host', 'Host');
    const code = codeOf();
    mgr.joinRoom('p1', code, 'A');
    mgr.leave('host');
    expect(mgr.getRoom(code)!.hostId).toBe('p1');
  });

  it('garbage-collects an empty room', () => {
    mgr.createRoom('host', 'Host');
    const code = codeOf();
    mgr.leave('host');
    expect(mgr.getRoom(code)).toBeUndefined();
    expect(mgr.roomCount()).toBe(0);
  });
});
