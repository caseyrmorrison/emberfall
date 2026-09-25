import { describe, expect, it } from 'vitest';
import { ENEMIES, REGIONS, type CombatAction } from '../src/game/data';
import {
  buyPotion,
  createBattle,
  DEFAULT_SETTINGS,
  forgeCost,
  gainXp,
  heal,
  intent,
  newPlayer,
  performAction,
  stats,
  upgrade,
  usePotion,
  xpToNext,
  type Battle,
  type Player,
} from '../src/game/model';
import { parseSave, serialize } from '../src/game/save';
import { findPath, makeWorld, walkable } from '../src/game/world';
const deterministic = () => 0.5;
function fight(p: Player, b: Battle) {
  for (let turn = 0; turn < 200 && b.outcome === 'active'; turn++) {
    const action: CombatAction =
      p.hp < b.attack * 1.5 && p.potions > 0
        ? 'potion'
        : intent(b).heavy
          ? 'guard'
          : ENEMIES[b.kind].weakness === 'fire' && p.mp >= 4
            ? 'ember'
            : 'attack';
    performAction(p, b, action, DEFAULT_SETTINGS, deterministic);
  }
  return b.outcome;
}
describe('combat and progression', () => {
  it('makes early encounters winnable and grants XP and gold once', () => {
    const p = newPlayer();
    const b = createBattle('slime', 0);
    expect(fight(p, b)).toBe('won');
    expect(p.xp).toBe(32);
    expect(p.gold).toBe(48);
    expect(p.kills).toBe(1);
    performAction(p, b, 'attack', DEFAULT_SETTINGS);
    expect(p.gold).toBe(48);
  });
  it('makes an unprepared first warden dangerous, but grindable', () => {
    const p = newPlayer();
    p.potions = 0;
    expect(fight(p, createBattle('guardian', 0))).toBe('lost');
    expect(p.level).toBe(1);
    expect(p.gold).toBe(27);
    expect(p.hp).toBe(100);
  });
  it('lets a prepared player complete all three wardens with tactical play', () => {
    const p = newPlayer();
    for (const [i, region] of REGIONS.entries()) {
      p.level = [4, 7, 10][i];
      p.weapon = [2, 4, 6][i];
      p.armor = [1, 3, 5][i];
      p.potions = 4;
      heal(p);
      const b = createBattle(region.boss, i as 0 | 1 | 2);
      expect(fight(p, b), region.name).toBe('won');
      expect(p.bosses).toContain(region.boss);
    }
    expect(p.bosses).toHaveLength(3);
  });
  it('does not advance turns for unavailable skills or consumables', () => {
    const p = newPlayer();
    p.mp = 0;
    p.potions = 0;
    const b = createBattle('slime', 0);
    performAction(p, b, 'ember', DEFAULT_SETTINGS);
    performAction(p, b, 'potion', DEFAULT_SETTINGS);
    expect(b.turn).toBe(1);
    expect(p.hp).toBe(100);
  });
  it('telegraphs heavy attacks and gives guard meaningful damage reduction', () => {
    const p = newPlayer();
    p.mp = 0;
    const b = createBattle('guardian', 0);
    b.turn = 3;
    expect(intent(b).heavy).toBe(true);
    performAction(p, b, 'guard', DEFAULT_SETTINGS);
    expect(p.hp).toBe(86);
    expect(p.mp).toBe(4);
    expect(intent(b).heavy).toBe(false);
  });
  it('stagger interrupts an enemy action and resets its meter', () => {
    const p = newPlayer();
    const b = createBattle('guardian', 0);
    b.stagger = 80;
    performAction(p, b, 'ember', DEFAULT_SETTINGS, deterministic);
    expect(p.hp).toBe(100);
    expect(b.stagger).toBe(0);
    expect(b.log.join(' ')).toContain('STAGGER');
  });
  it('allows safe escape from common enemies but not wardens', () => {
    const p = newPlayer();
    const b = createBattle('wolf', 0);
    performAction(p, b, 'flee', DEFAULT_SETTINGS);
    expect(b.outcome).toBe('fled');
    const boss = createBattle('guardian', 0);
    performAction(p, boss, 'flee', DEFAULT_SETTINGS);
    expect(boss.outcome).toBe('active');
    expect(boss.turn).toBe(1);
  });
  it('fully restores resources on multi-level gains and caps at 99', () => {
    const p = newPlayer();
    p.hp = 1;
    p.mp = 0;
    gainXp(p, 1000);
    expect(p.level).toBeGreaterThan(3);
    expect(p.hp).toBe(stats(p).maxHp);
    expect(p.xp).toBeLessThan(xpToNext(p.level));
    gainXp(p, 99_999_999);
    expect(p.level).toBe(99);
    expect(p.xp).toBe(0);
  });
  it('keeps forge purchases and potions within their resource limits', () => {
    const p = newPlayer();
    expect(upgrade(p, 'weapon')).toBe(false);
    p.gold = forgeCost(0);
    expect(upgrade(p, 'weapon')).toBe(true);
    expect(p.gold).toBe(0);
    expect(stats(p).attack).toBe(20);
    expect(buyPotion(p)).toBe(false);
    expect(usePotion(p)).toBe(false);
    p.hp = 1;
    expect(usePotion(p)).toBe(true);
    expect(p.hp).toBe(66);
    expect(p.potions).toBe(2);
    p.weapon = 25;
    p.gold = 99999;
    expect(upgrade(p, 'weapon')).toBe(false);
    p.potions = 99;
    expect(buyPotion(p)).toBe(false);
  });
  it('grinding creates a strong, permanent advantage without scaling old enemies', () => {
    const p = newPlayer();
    for (let i = 0; i < 35; i++) {
      heal(p);
      expect(fight(p, createBattle('slime', 0))).toBe('won');
    }
    expect(p.level).toBeGreaterThan(5);
    expect(p.gold).toBeGreaterThan(650);
    expect(p.claimedBounty).toBe(true);
    const b = createBattle('slime', 0);
    performAction(p, b, 'ember', DEFAULT_SETTINGS, deterministic);
    expect(b.outcome).toBe('won');
  });
});
describe('saves and world integrity', () => {
  it('round-trips progress and settings', () => {
    const p = newPlayer();
    p.gold = 789;
    p.seen = ['awakening'];
    const save = parseSave(serialize(p, { ...DEFAULT_SETTINGS, music: true }));
    expect(save.player).toEqual(p);
    expect(save.settings.music).toBe(true);
  });
  it('rejects malformed and incompatible saves', () => {
    for (const raw of ['', '{}', 'null', '{"version":2,"player":{}}', 'x'.repeat(100001)])
      expect(() => parseSave(raw)).toThrow();
  });
  it('sanitizes untrusted values without executing or rendering imported content', () => {
    const p = parseSave(
      JSON.stringify({
        version: 1,
        player: {
          level: 500,
          hp: -8,
          gold: -10,
          weapon: 900,
          region: 2,
          bosses: ['eclipse', '<script>'],
          seen: ['<img src=x>'],
        },
        settings: { volume: 500 },
      }),
    );
    expect(p.player.level).toBe(99);
    expect(p.player.hp).toBe(1);
    expect(p.player.gold).toBe(0);
    expect(p.player.region).toBe(0);
    expect(p.player.weapon).toBe(25);
    expect(p.player.seen).toEqual([]);
    expect(p.settings.volume).toBe(1);
  });
  it.each([0, 1, 2] as const)('keeps every objective reachable in region %i', (region) => {
    const w = makeWorld(region);
    for (const entity of w.entities) {
      expect(walkable(w, entity.x, entity.y)).toBe(true);
      const path = findPath(w, { x: 11, y: 17 }, entity);
      expect(path.length, entity.id).toBeGreaterThan(0);
      expect(path.every((p) => walkable(w, p.x, p.y))).toBe(true);
    }
  });
});
