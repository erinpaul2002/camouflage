import { describe, expect, it } from 'vitest';
import { PREP_SECONDS, ROLE_REVEAL_SECONDS, SEEK_SECONDS } from '@blendquest/shared';
import { addPlayer, createRoom, startGame } from './room.js';
import { advance } from './phase.js';

function started(now = 1000) {
  let s = createRoom('ABCDE', 'p0', 'Host', 'forest');
  s = addPlayer(s, 'p1', 'A');
  s = addPlayer(s, 'p2', 'B');
  return startGame(s, now, () => 0); // role_reveal
}

describe('advance — phase machine (F4/F5)', () => {
  it('does nothing before the timer expires', () => {
    const s = started(1000);
    const out = advance(s, 1500); // reveal ends at 1000 + 4s
    expect(out.changed).toBe(false);
    expect(out.state.phase).toBe('role_reveal');
  });

  it('walks role_reveal → prep → seek → round_end → role_reveal in order', () => {
    let s = started(0);

    let now = ROLE_REVEAL_SECONDS * 1000;
    let out = advance(s, now);
    expect(out.changed).toBe(true);
    expect(out.state.phase).toBe('prep');

    now += PREP_SECONDS * 1000;
    out = advance(out.state, now);
    expect(out.state.phase).toBe('seek');

    now += SEEK_SECONDS * 1000;
    out = advance(out.state, now);
    expect(out.state.phase).toBe('round_end');
    expect(out.state.lastResult).not.toBeNull();

    now += 1_000_000;
    out = advance(out.state, now);
    expect(out.state.phase).toBe('role_reveal');
    expect(out.state.round).toBe(2);
  });

  it('ends seek early once every hider is found', () => {
    let s = started(0);
    s = advance(s, ROLE_REVEAL_SECONDS * 1000).state; // prep
    s = advance(s, ROLE_REVEAL_SECONDS * 1000 + PREP_SECONDS * 1000).state; // seek
    expect(s.phase).toBe('seek');
    s = { ...s, players: { ...s.players, p1: { ...s.players.p1!, found: true }, p2: { ...s.players.p2!, found: true } } };
    const out = advance(s, s.phaseEndsAt - 1000); // before timer, but all found
    expect(out.changed).toBe(true);
    expect(out.state.phase).toBe('round_end');
    expect(out.state.lastResult!.winner).toBe('seekers');
  });

  it('rotates the seeker on the next round', () => {
    let s = started(0);
    const firstSeeker = Object.keys(s.players).find((id) => s.players[id]!.role === 'seeker')!;
    // Fast-forward a whole loop back to role_reveal.
    s = advance(s, s.phaseEndsAt).state; // prep
    s = advance(s, s.phaseEndsAt).state; // seek
    s = advance(s, s.phaseEndsAt).state; // round_end
    s = advance(s, s.phaseEndsAt).state; // role_reveal (round 2)
    const secondSeeker = Object.keys(s.players).find((id) => s.players[id]!.role === 'seeker')!;
    expect(secondSeeker).not.toBe(firstSeeker);
  });
});
