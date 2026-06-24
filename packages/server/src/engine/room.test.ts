import { describe, expect, it } from 'vitest';
import { ENVIRONMENT_IDS, MAX_PLAYERS } from '@blendquest/shared';
import {
  addPlayer,
  beginPrep,
  canStart,
  createRoom,
  isFull,
  nextEnvironment,
  playerCount,
  removePlayer,
  startGame,
  startNextRound,
} from './room.js';

function lobbyWith(n: number) {
  let state = createRoom('ABCDE', 'p0', 'Host', 'forest');
  for (let i = 1; i < n; i++) state = addPlayer(state, `p${i}`, `P${i}`);
  return state;
}

describe('createRoom', () => {
  it('starts in lobby with the host as the only (host) player', () => {
    const s = createRoom('ABCDE', 'p0', 'Host', 'forest');
    expect(s.phase).toBe('lobby');
    expect(s.hostId).toBe('p0');
    expect(s.players.p0!.isHost).toBe(true);
    expect(playerCount(s)).toBe(1);
  });
});

describe('addPlayer', () => {
  it('adds players immutably without mutating the source', () => {
    const s0 = createRoom('ABCDE', 'p0', 'Host', 'forest');
    const s1 = addPlayer(s0, 'p1', 'Bee');
    expect(playerCount(s0)).toBe(1);
    expect(playerCount(s1)).toBe(2);
    expect(s1.players.p1!.isHost).toBe(false);
  });

  it('is idempotent for an existing id', () => {
    const s1 = addPlayer(createRoom('ABCDE', 'p0', 'Host', 'forest'), 'p0', 'dup');
    expect(playerCount(s1)).toBe(1);
  });

  it('reports full at MAX_PLAYERS', () => {
    const full = lobbyWith(MAX_PLAYERS);
    expect(isFull(full)).toBe(true);
    expect(playerCount(full)).toBe(MAX_PLAYERS);
  });
});

describe('removePlayer', () => {
  it('promotes a new host when the host leaves', () => {
    const s = lobbyWith(3);
    const next = removePlayer(s, 'p0');
    expect(next.hostId).not.toBe('p0');
    expect(next.players[next.hostId]!.isHost).toBe(true);
    expect(playerCount(next)).toBe(2);
  });

  it('signals an empty room when the last player leaves', () => {
    const s = createRoom('ABCDE', 'p0', 'Host', 'forest');
    const next = removePlayer(s, 'p0');
    expect(playerCount(next)).toBe(0);
  });
});

describe('canStart', () => {
  it('allows the host to start with >= 3 players', () => {
    expect(canStart(lobbyWith(3), 'p0')).toBe(true);
  });
  it('blocks below the minimum', () => {
    expect(canStart(lobbyWith(2), 'p0')).toBe(false);
  });
  it('blocks non-hosts', () => {
    expect(canStart(lobbyWith(3), 'p1')).toBe(false);
  });
});

describe('startGame / round flow', () => {
  it('assigns one seeker and enters role_reveal at round 1', () => {
    const s = startGame(lobbyWith(4), 1000, () => 1);
    expect(s.phase).toBe('role_reveal');
    expect(s.round).toBe(1);
    expect(s.phaseEndsAt).toBeGreaterThan(1000);
    const seekers = Object.values(s.players).filter((p) => p.role === 'seeker');
    expect(seekers).toHaveLength(1);
  });

  it('beginPrep transitions role_reveal -> prep with a fresh timer', () => {
    const reveal = startGame(lobbyWith(3), 1000, () => 0);
    const prep = beginPrep(reveal, 5000);
    expect(prep.phase).toBe('prep');
    expect(prep.phaseEndsAt).toBeGreaterThan(5000);
  });

  it('rotates the environment each round, wrapping around', () => {
    expect(nextEnvironment(ENVIRONMENT_IDS[0]!)).toBe(ENVIRONMENT_IDS[1]!);
    expect(nextEnvironment(ENVIRONMENT_IDS[ENVIRONMENT_IDS.length - 1]!)).toBe(ENVIRONMENT_IDS[0]!);
    const next = startNextRound(startGame(lobbyWith(3), 1000, () => 0), 2000);
    expect(next.environmentId).toBe(ENVIRONMENT_IDS[1]!); // forest -> underwater
  });

  it('startNextRound rotates the seeker and resets found flags', () => {
    let s = startGame(lobbyWith(4), 1000, () => 0); // p0 seeker
    s = { ...s, players: { ...s.players, p1: { ...s.players.p1!, found: true } } };
    const next = startNextRound(s, 2000);
    expect(next.round).toBe(2);
    expect(next.players.p0!.role).not.toBe('seeker');
    expect(next.players.p1!.found).toBe(false);
  });
});
