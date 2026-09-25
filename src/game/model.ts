import { ENEMIES, type EnemyKind, type RegionId, type CombatAction } from './data';
export interface Player {
  level: number;
  xp: number;
  hp: number;
  mp: number;
  gold: number;
  potions: number;
  weapon: number;
  armor: number;
  kills: number;
  bosses: EnemyKind[];
  region: RegionId;
  x: number;
  y: number;
  seen: string[];
  claimedBounty: boolean;
}
export interface Settings {
  music: boolean;
  sfx: boolean;
  reducedMotion: boolean;
  difficulty: 'normal' | 'heroic';
  volume: number;
}
export interface Save {
  version: 1;
  player: Player;
  settings: Settings;
  savedAt: number;
}
export interface Battle {
  kind: EnemyKind;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  xp: number;
  gold: number;
  turn: number;
  stagger: number;
  log: string[];
  outcome: 'active' | 'won' | 'lost' | 'fled';
  lastDamage: number;
  lastTarget: 'enemy' | 'player';
  empowered: boolean;
}
export const MAX_LEVEL = 99;
export const DEFAULT_SETTINGS: Settings = {
  music: false,
  sfx: true,
  reducedMotion: false,
  difficulty: 'normal',
  volume: 0.3,
};
export function newPlayer(): Player {
  return {
    level: 1,
    xp: 0,
    hp: 100,
    mp: 12,
    gold: 30,
    potions: 3,
    weapon: 0,
    armor: 0,
    kills: 0,
    bosses: [],
    region: 0,
    x: 11,
    y: 17,
    seen: [],
    claimedBounty: false,
  };
}
export function stats(p: Player) {
  return {
    maxHp: 100 + (p.level - 1) * 15,
    maxMp: 12 + (p.level - 1) * 2,
    attack: 16 + (p.level - 1) * 3 + p.weapon * 4,
    defense: 3 + (p.level - 1) * 1.3 + p.armor * 2,
  };
}
export function xpToNext(level: number): number {
  return 55 + level * 23;
}
export function forgeCost(rank: number): number {
  return 45 + rank * 35;
}
export function heal(p: Player): void {
  p.hp = stats(p).maxHp;
  p.mp = stats(p).maxMp;
}
export function gainXp(p: Player, amount: number): number {
  p.xp += amount;
  let gained = 0;
  while (p.level < MAX_LEVEL && p.xp >= xpToNext(p.level)) {
    p.xp -= xpToNext(p.level);
    p.level++;
    gained++;
  }
  if (p.level === MAX_LEVEL) p.xp = 0;
  if (gained) heal(p);
  return gained;
}
export function upgrade(p: Player, slot: 'weapon' | 'armor'): boolean {
  const cost = forgeCost(p[slot]);
  if (p.gold < cost || p[slot] >= 25) return false;
  p.gold -= cost;
  p[slot]++;
  return true;
}
export function buyPotion(p: Player): boolean {
  if (p.gold < 20 || p.potions >= 99) return false;
  p.gold -= 20;
  p.potions++;
  return true;
}
export function usePotion(p: Player): boolean {
  if (p.potions <= 0 || p.hp >= stats(p).maxHp) return false;
  p.potions--;
  p.hp = Math.min(stats(p).maxHp, p.hp + Math.ceil(stats(p).maxHp * 0.65));
  return true;
}
export function createBattle(kind: EnemyKind, region: RegionId, repeatBoss = false): Battle {
  const e = ENEMIES[kind];
  const scale = e.boss ? (repeatBoss ? 1.45 : 1) : 1 + region * 0.85;
  const hp = Math.round(e.hp * scale);
  return {
    kind,
    hp,
    maxHp: hp,
    attack: Math.round(e.attack * scale),
    defense: e.defense + (e.boss ? 0 : region * 2),
    xp: Math.round(e.xp * scale),
    gold: Math.round(e.gold * scale),
    turn: 1,
    stagger: 0,
    log: [`${e.name} stands in your way.`],
    outcome: 'active',
    lastDamage: 0,
    lastTarget: 'enemy',
    empowered: repeatBoss,
  };
}
export function intent(b: Battle): { heavy: boolean; label: string } {
  return b.turn % 3 === 0
    ? { heavy: true, label: 'Heavy strike · guard now' }
    : {
        heavy: false,
        label: b.turn % 3 === 2 ? 'Strike · heavy attack next turn' : 'Strike · steady attack',
      };
}
export function performAction(
  p: Player,
  b: Battle,
  action: CombatAction,
  settings: Settings,
  random: () => number = Math.random,
): string[] {
  if (b.outcome !== 'active') return [];
  const lines: string[] = [];
  const s = stats(p);
  const e = ENEMIES[b.kind];
  if (action === 'ember' && p.mp < 4) return ['Not enough focus. Guard to recover 4 focus.'];
  if (action === 'flee') {
    if (e.boss) return ['The warden seals the path. Stand your ground.'];
    b.outcome = 'fled';
    b.log.push('You slip safely back to the trail.');
    return ['You slip safely back to the trail.'];
  }
  if (action === 'potion') {
    if (!usePotion(p)) return ['No healing needed, or no potions remaining.'];
    lines.push('Moonwell tonic restores 65% of your maximum health.');
  }
  let stunned = false;
  if (action === 'attack' || action === 'ember') {
    const elemental = action === 'ember';
    if (elemental) p.mp -= 4;
    else p.mp = Math.min(s.maxMp, p.mp + 1);
    const weak = e.weakness === (elemental ? 'fire' : 'steel');
    const crit = random() < 0.12;
    const damage = Math.max(
      1,
      Math.round(
        (s.attack * (elemental ? 1.65 : 1) * (weak ? 1.35 : 1) * (crit ? 1.5 : 1) - b.defense) *
          (0.94 + random() * 0.12),
      ),
    );
    b.hp = Math.max(0, b.hp - damage);
    b.lastDamage = damage;
    b.lastTarget = 'enemy';
    lines.push(
      `${elemental ? 'Ember Arc' : 'Sword strike'} deals ${damage}${weak ? ' · weakness' : ''}${crit ? ' · critical!' : '.'}`,
    );
    b.stagger += weak ? 40 : 20;
    if (b.stagger >= 100) {
      b.stagger = 0;
      stunned = true;
      lines.push('STAGGER! The enemy loses its next action.');
    }
  }
  if (b.hp === 0) {
    b.outcome = 'won';
    p.gold += b.gold;
    p.kills++;
    const levels = gainXp(p, b.xp);
    p.mp = Math.min(stats(p).maxMp, p.mp + 3);
    if (e.boss && !p.bosses.includes(b.kind)) {
      p.bosses.push(b.kind);
      heal(p);
    }
    lines.push(`Victory! +${b.xp} XP · +${b.gold} gold.`);
    if (levels) lines.push(`Level ${p.level}! Health and focus fully restored.`);
    if (!p.claimedBounty && p.kills >= 5) {
      p.claimedBounty = true;
      p.gold += 75;
      p.potions = Math.min(99, p.potions + 2);
      lines.push('Trailkeeper bounty complete! +75 gold · +2 tonics.');
    }
  } else {
    if (action === 'guard') {
      p.mp = Math.min(s.maxMp, p.mp + 4);
      lines.push('You brace yourself. +4 focus · 75% damage reduction.');
    }
    if (!stunned) {
      const heavy = intent(b).heavy;
      const damage = Math.max(
        1,
        Math.round(
          (b.attack * (heavy ? 2 : 1) * (settings.difficulty === 'heroic' ? 1.3 : 1) - s.defense) *
            (action === 'guard' ? 0.25 : 1),
        ),
      );
      p.hp = Math.max(0, p.hp - damage);
      lines.push(`${e.name} ${heavy ? 'unleashes a heavy strike' : 'strikes'} for ${damage}.`);
      if (action === 'guard' || action === 'potion') {
        b.lastDamage = damage;
        b.lastTarget = 'player';
      }
    }
    b.turn++;
    if (p.hp <= 0) {
      b.outcome = 'lost';
      const lost = Math.min(30, Math.floor(p.gold * 0.1));
      p.gold -= lost;
      heal(p);
      p.x = 11;
      p.y = 17;
      lines.push(
        `Mira brings you back to camp. Lost ${lost} gold. Your experience and equipment are safe.`,
      );
    }
  }
  b.log.push(...lines);
  b.log = b.log.slice(-8);
  return lines;
}
