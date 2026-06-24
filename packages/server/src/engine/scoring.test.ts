import { describe, expect, it } from 'vitest';
import { SCORE_HIDER_SURVIVE, SCORE_SEEKER_FIND } from '@blendquest/shared';
import { addPlayer, createRoom, startGame } from './room.js';
import { allHidersFound, computeResult } from './scoring.js';

function seekGame() {
  let s = createRoom('ABCDE', 'p0', 'Host', 'forest');
  s = addPlayer(s, 'p1', 'A');
  s = addPlayer(s, 'p2', 'B');
  s = startGame(s, 1000, () => 0); // p0 = seeker, p1/p2 = hiders
  return s;
}

describe('allHidersFound', () => {
  it('is false while any hider is unfound', () => {
    expect(allHidersFound(seekGame())).toBe(false);
  });
  it('is true when every hider is found', () => {
    let s = seekGame();
    s = { ...s, players: { ...s.players, p1: { ...s.players.p1!, found: true }, p2: { ...s.players.p2!, found: true } } };
    expect(allHidersFound(s)).toBe(true);
  });
});

describe('computeResult', () => {
  it('hiders win and survivors score when some remain hidden', () => {
    const out = computeResult(seekGame());
    expect(out.lastResult!.winner).toBe('hiders');
    expect(out.players.p1!.score).toBe(SCORE_HIDER_SURVIVE);
    expect(out.players.p2!.score).toBe(SCORE_HIDER_SURVIVE);
    expect(out.players.p0!.score).toBe(0); // seeker found nobody
  });

  it('seekers win and the seeker scores per find when all are found', () => {
    let s = seekGame();
    s = { ...s, players: { ...s.players, p1: { ...s.players.p1!, found: true }, p2: { ...s.players.p2!, found: true } } };
    const out = computeResult(s);
    expect(out.lastResult!.winner).toBe('seekers');
    expect(out.players.p0!.score).toBe(2 * SCORE_SEEKER_FIND);
    expect(out.players.p1!.score).toBe(0); // found hiders don't score
    expect(out.lastResult!.foundIds.sort()).toEqual(['p1', 'p2']);
  });

  it('records every player position in the reveal', () => {
    const out = computeResult(seekGame());
    expect(Object.keys(out.lastResult!.positions).sort()).toEqual(['p0', 'p1', 'p2']);
  });
});
