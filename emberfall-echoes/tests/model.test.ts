import { describe, expect, it } from 'vitest';
import {
  act,
  addXp,
  beginEncounter,
  buyTonic,
  claimOutcome,
  createArena,
  discover,
  forgeCost,
  INITIAL_SETTINGS,
  newPlayer,
  rest,
  stats,
  step,
  upgrade,
  useTonic,
  type Arena,
  type Player,
} from '../src/game/model';
import { parseSave, serialize } from '../src/game/save';

function simulate(p: Player, a: Arena, seconds: number, shoot = false) {
  for (let i = 0; i < seconds * 60 && !['won', 'lost'].includes(a.outcome); i++) {
    if (shoot) {
      act(p, a, 'strike');
      if (p.focus >= 25) act(p, a, 'flare');
    }
    step(p, a, 1 / 60, { x: 0, y: 0 }, INITIAL_SETTINGS);
  }
}
describe('smooth action combat', () => {
  it('lets a starting character defeat a common echo without grinding', () => {
    const p = newPlayer();
    const a = beginEncounter(p, false);
    simulate(p, a, 15, true);
    expect(a.outcome).toBe('won');
    expect(p.hp).toBeGreaterThan(0);
    expect(claimOutcome(p, a)).toHaveLength(1);
    expect(p.gold).toBe(69);
    expect(p.wins).toBe(1);
    claimOutcome(p, a);
    expect(p.gold).toBe(69);
  });
  it('makes standing still without defending dangerous against a warden', () => {
    const p = newPlayer();
    const a = beginEncounter(p, true);
    simulate(p, a, 30);
    expect(a.outcome).toBe('lost');
    claimOutcome(p, a);
    expect(p.hp).toBe(120);
    expect(p.gold).toBe(41);
    expect(p.level).toBe(1);
  });
  it('dash evades a marked attack and is gated by cooldown', () => {
    const p = newPlayer();
    const a = beginEncounter(p, false);
    a.intro = 0;
    a.enemyClock = 100;
    a.warnings.push({
      ...a.hero,
      radius: 100,
      time: 0.01,
      duration: 1,
      damage: 80,
      kind: 'circle',
    });
    expect(act(p, a, 'dash', { x: 1, y: 0 })).toBe(true);
    expect(act(p, a, 'dash')).toBe(false);
    step(p, a, 0.02, { x: 0, y: 0 }, INITIAL_SETTINGS);
    expect(p.hp).toBe(120);
    expect(a.hero.x).toBeGreaterThan(270);
  });
  it('a marked attack damages a player who does not dodge', () => {
    const p = newPlayer();
    const a = beginEncounter(p, false);
    a.intro = 0;
    a.enemyClock = 100;
    a.warnings.push({ ...a.hero, radius: 60, time: 0.01, duration: 1, damage: 20, kind: 'circle' });
    step(p, a, 0.02, { x: 0, y: 0 }, INITIAL_SETTINGS);
    expect(p.hp).toBe(101);
  });
  it('uses the visible ellipse boundary for ground damage', () => {
    for (const [dx, dy, expectedHp] of [
      [0, 50, 120],
      [50, 0, 101],
    ]) {
      const p = newPlayer();
      const a = beginEncounter(p, false);
      a.intro = 0;
      a.enemyClock = 100;
      a.warnings.push({
        x: a.hero.x + dx,
        y: a.hero.y + dy,
        radius: 60,
        time: 0.01,
        duration: 1,
        damage: 20,
        kind: 'circle',
      });
      step(p, a, 0.02, { x: 0, y: 0 }, INITIAL_SETTINGS);
      expect(p.hp).toBe(expectedHp);
    }
  });
  it('focus and cooldowns prevent spell spam, then recover over time', () => {
    const p = newPlayer();
    const a = beginEncounter(p, true);
    expect(act(p, a, 'flare')).toBe(true);
    expect(p.focus).toBe(75);
    expect(act(p, a, 'flare')).toBe(false);
    p.focus = 0;
    simulate(p, a, 2);
    expect(p.focus).toBeGreaterThan(10);
    expect(act(p, a, 'flare')).toBe(false);
  });
  it('clamps long frame deltas and keeps movement within the playable ground', () => {
    const p = newPlayer();
    const a = createArena();
    step(p, a, 500, { x: 1, y: 1 }, INITIAL_SETTINGS);
    expect(a.hero.x).toBeLessThan(285);
    for (let i = 0; i < 500; i++) step(p, a, 0.05, { x: 1, y: 1 }, INITIAL_SETTINGS);
    expect(a.hero.x).toBe(905);
    expect(a.hero.y).toBe(525);
  });
  it('upgrades and levels let a prepared player complete all wardens', () => {
    const p = newPlayer();
    for (const region of [0, 1, 2] as const) {
      p.region = region;
      p.level = [5, 8, 12][region];
      p.weapon = [2, 4, 6][region];
      p.armor = [2, 4, 6][region];
      rest(p);
      const a = beginEncounter(p, true);
      simulate(p, a, 60, true);
      expect(a.outcome, `region ${region}`).toBe('won');
      claimOutcome(p, a);
      expect(p.wardens).toBe(region + 1);
    }
  });
  it('does not grant warden progress when replaying an earlier boss', () => {
    const p = newPlayer();
    p.wardens = 2;
    const a = beginEncounter(p, true);
    a.outcome = 'won';
    claimOutcome(p, a);
    expect(p.wardens).toBe(2);
  });
  it('stagger clears telegraphs and postpones the next enemy attack', () => {
    const p = newPlayer();
    const a = beginEncounter(p, true);
    a.intro = 0;
    a.enemy!.stagger = 99;
    a.enemyClock = 2;
    a.warnings.push({ ...a.hero, radius: 50, time: 1, duration: 1, damage: 20, kind: 'circle' });
    a.projectiles.push({
      x: 755,
      y: 360,
      vx: 0,
      vy: 0,
      radius: 20,
      damage: 1,
      owner: 'hero',
      kind: 'flare',
      life: 1,
    });
    step(p, a, 0.01, { x: 0, y: 0 }, INITIAL_SETTINGS);
    expect(a.enemy!.stagger).toBe(0);
    expect(a.warnings).toHaveLength(0);
    expect(a.enemyClock).toBeGreaterThan(3);
  });
});
describe('progression and persistence', () => {
  it('treasure and memories can each be claimed only once per region', () => {
    const p = newPlayer();
    expect(discover(p, 'treasure')).toBe(true);
    expect(discover(p, 'treasure')).toBe(false);
    expect(p.gold).toBe(90);
    expect(p.tonics).toBe(4);
    expect(discover(p, 'memory')).toBe(true);
    expect(discover(p, 'memory')).toBe(false);
    expect(p.xp).toBe(40);
  });
  it('levels restore health and stop at 99', () => {
    const p = newPlayer();
    p.hp = 1;
    p.focus = 0;
    addXp(p, 500);
    expect(p.level).toBeGreaterThan(2);
    expect(p.hp).toBe(stats(p).hp);
    expect(p.focus).toBe(100);
    addXp(p, 99999999);
    expect(p.level).toBe(99);
    expect(p.xp).toBe(0);
  });
  it('purchases preserve resource limits', () => {
    const p = newPlayer();
    expect(upgrade(p, 'weapon')).toBe(false);
    p.gold = forgeCost(0);
    expect(upgrade(p, 'weapon')).toBe(true);
    expect(p.gold).toBe(0);
    expect(stats(p).power).toBe(23);
    expect(buyTonic(p)).toBe(false);
    expect(useTonic(p)).toBe(false);
    p.hp = 1;
    expect(useTonic(p)).toBe(true);
    expect(p.hp).toBe(79);
  });
  it('round-trips valid saves and rejects the original pixel game save format', () => {
    const p = newPlayer();
    p.gold = 987;
    expect(parseSave(serialize(p, INITIAL_SETTINGS)).player).toEqual(p);
    expect(() =>
      parseSave(JSON.stringify({ version: 1, player: p, settings: INITIAL_SETTINGS })),
    ).toThrow();
  });
  it('rejects incompatible data and sanitizes imported values', () => {
    for (const raw of ['null', '{}', 'x'.repeat(100001)]) expect(() => parseSave(raw)).toThrow();
    const valid = JSON.parse(serialize(newPlayer(), INITIAL_SETTINGS));
    valid.player.level = 500;
    valid.player.gold = -10;
    valid.player.seen = ['<img>'];
    valid.player.region = 10;
    valid.settings.volume = 8;
    const read = parseSave(JSON.stringify(valid));
    expect(read.player.level).toBe(99);
    expect(read.player.gold).toBe(0);
    expect(read.player.region).toBe(0);
    expect(read.player.seen).toEqual([]);
    expect(read.settings.volume).toBe(1);
  });
});
