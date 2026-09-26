import { REGIONS, type RegionId } from './content';

export const WARNING_DEPTH = 0.58;
export interface Player {
  level: number;
  xp: number;
  gold: number;
  hp: number;
  focus: number;
  tonics: number;
  weapon: number;
  armor: number;
  region: RegionId;
  wardens: number;
  wins: number;
  memories: RegionId[];
  treasures: RegionId[];
  seen: string[];
}
export interface Settings {
  music: boolean;
  effects: boolean;
  volume: number;
  reducedMotion: boolean;
  difficulty: 'adventurer' | 'heroic';
}
export interface Point {
  x: number;
  y: number;
}
export type Action = 'strike' | 'flare' | 'dash' | 'tonic';
export interface Projectile extends Point {
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  owner: 'hero' | 'enemy';
  life: number;
  kind: 'blade' | 'flare' | 'orb';
}
export interface Warning extends Point {
  radius: number;
  time: number;
  duration: number;
  damage: number;
  kind: 'circle' | 'line';
  end?: Point;
}
export interface Effect extends Point {
  kind: 'burst' | 'slash' | 'dash' | 'heal' | 'damage';
  life: number;
  maxLife: number;
  color: string;
  text?: string;
}
export interface Enemy extends Point {
  hp: number;
  maxHp: number;
  attack: number;
  name: string;
  boss: boolean;
  xp: number;
  gold: number;
  stagger: number;
  flash: number;
}
export interface Arena {
  hero: Point;
  target: Point | null;
  facing: 1 | -1;
  enemy: Enemy | null;
  projectiles: Projectile[];
  warnings: Warning[];
  effects: Effect[];
  cooldowns: Record<Action, number>;
  invincible: number;
  clock: number;
  enemyClock: number;
  cycle: number;
  outcome: 'exploring' | 'active' | 'won' | 'lost';
  notices: string[];
  combo: number;
  rewardClaimed: boolean;
  dashVector: Point;
  attackPose: number;
  intro: number;
}
export const INITIAL_SETTINGS: Settings = {
  music: false,
  effects: true,
  volume: 0.4,
  reducedMotion: false,
  difficulty: 'adventurer',
};
export function newPlayer(): Player {
  return {
    level: 1,
    xp: 0,
    gold: 45,
    hp: 120,
    focus: 100,
    tonics: 3,
    weapon: 0,
    armor: 0,
    region: 0,
    wardens: 0,
    wins: 0,
    memories: [],
    treasures: [],
    seen: [],
  };
}
export function stats(p: Player) {
  return {
    hp: 120 + (p.level - 1) * 18,
    power: 18 + (p.level - 1) * 3 + p.weapon * 5,
    defense: 1 + (p.level - 1) * 0.5 + p.armor * 2,
  };
}
export const xpNeeded = (level: number) => 65 + level * 25;
export const forgeCost = (rank: number) => 50 + 35 * rank;
export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
export function rest(p: Player) {
  p.hp = stats(p).hp;
  p.focus = 100;
}
export function addXp(p: Player, amount: number): number {
  let levels = 0;
  p.xp += amount;
  while (p.level < 99 && p.xp >= xpNeeded(p.level)) {
    p.xp -= xpNeeded(p.level);
    p.level++;
    levels++;
  }
  if (p.level === 99) p.xp = 0;
  if (levels) rest(p);
  return levels;
}
export function upgrade(p: Player, slot: 'weapon' | 'armor'): boolean {
  if (p[slot] >= 25 || p.gold < forgeCost(p[slot])) return false;
  p.gold -= forgeCost(p[slot]);
  p[slot]++;
  return true;
}
export function buyTonic(p: Player): boolean {
  if (p.gold < 20 || p.tonics >= 99) return false;
  p.gold -= 20;
  p.tonics++;
  return true;
}
export function useTonic(p: Player): boolean {
  if (p.tonics < 1 || p.hp >= stats(p).hp) return false;
  p.tonics--;
  p.hp = Math.min(stats(p).hp, p.hp + Math.ceil(stats(p).hp * 0.65));
  return true;
}
export function discover(p: Player, kind: 'memory' | 'treasure'): boolean {
  const list = kind === 'memory' ? p.memories : p.treasures;
  if (list.includes(p.region)) return false;
  list.push(p.region);
  if (kind === 'memory') addXp(p, 40 + p.region * 30);
  else {
    p.gold += 45 + p.region * 30;
    p.tonics = Math.min(99, p.tonics + 1);
  }
  return true;
}
export function createArena(): Arena {
  return {
    hero: { x: 270, y: 430 },
    target: null,
    facing: 1,
    enemy: null,
    projectiles: [],
    warnings: [],
    effects: [],
    cooldowns: { strike: 0, flare: 0, dash: 0, tonic: 0 },
    invincible: 0,
    clock: 0,
    enemyClock: 1.6,
    cycle: 0,
    outcome: 'exploring',
    notices: [],
    combo: 0,
    rewardClaimed: false,
    dashVector: { x: 1, y: 0 },
    attackPose: 0,
    intro: 0,
  };
}
export function beginEncounter(p: Player, boss: boolean): Arena {
  const a = createArena();
  const r = REGIONS[p.region];
  const awakened = boss && p.wardens > p.region;
  const hp = boss ? Math.round(r.hp * (awakened ? 1.35 : 1)) : [130, 265, 440][p.region];
  a.enemy = {
    x: 755,
    y: 405,
    hp,
    maxHp: hp,
    attack: (boss ? r.attack : [14, 23, 34][p.region]) * (awakened ? 1.2 : 1),
    name: boss
      ? `${awakened ? 'Awakened ' : ''}${r.boss}`
      : ['Wandering Echo', 'Drowned Echo', 'Moonveil Echo'][p.region],
    boss,
    xp: boss ? [230, 390, 700][p.region] : [45, 85, 130][p.region],
    gold: boss ? [170, 280, 450][p.region] : [24, 40, 65][p.region],
    stagger: 0,
    flash: 0,
  };
  a.outcome = 'active';
  a.intro = 0.8;
  return a;
}
function effect(a: Arena, point: Point, kind: Effect['kind'], color: string, text?: string) {
  a.effects.push({ ...point, kind, color, text, life: 0.7, maxLife: 0.7 });
}
export function act(p: Player, a: Arena, action: Action, direction: Point = a.dashVector): boolean {
  if (
    (a.outcome !== 'active' && action !== 'tonic' && action !== 'dash') ||
    ['won', 'lost'].includes(a.outcome) ||
    a.cooldowns[action] > 0
  )
    return false;
  if (action === 'tonic') {
    if (!useTonic(p)) return false;
    a.cooldowns.tonic = 4;
    effect(a, a.hero, 'heal', '#c3f6ba', '+ HEAL');
    return true;
  }
  if (action === 'dash') {
    const length = Math.hypot(direction.x, direction.y) || 1;
    a.dashVector = { x: direction.x / length, y: direction.y / length };
    a.invincible = 0.32;
    a.cooldowns.dash = 1.8;
    a.target = null;
    effect(a, a.hero, 'dash', '#c2e8de');
    return true;
  }
  if (!a.enemy || (action === 'flare' && p.focus < 25)) return false;
  if (action === 'flare') p.focus -= 25;
  a.cooldowns[action] = action === 'strike' ? 0.62 : 2.5;
  a.attackPose = 0.3;
  const from = { x: a.hero.x + (a.enemy.x > a.hero.x ? 20 : -20), y: a.hero.y - 40 };
  const aim = { x: a.enemy.x - from.x, y: a.enemy.y - 45 - from.y };
  const length = Math.hypot(aim.x, aim.y) || 1;
  a.facing = aim.x >= 0 ? 1 : -1;
  a.projectiles.push({
    ...from,
    vx: (aim.x / length) * 740,
    vy: (aim.y / length) * 740,
    radius: action === 'flare' ? 20 : 12,
    damage: stats(p).power * (action === 'flare' ? 2.7 : 1),
    owner: 'hero',
    life: 2,
    kind: action === 'flare' ? 'flare' : 'blade',
  });
  effect(a, from, 'slash', '#ffe7b2');
  return true;
}
function damageHero(p: Player, a: Arena, damage: number, settings: Settings) {
  if (a.invincible > 0 || a.outcome !== 'active') return;
  const actual = Math.max(
    1,
    Math.round(damage * (settings.difficulty === 'heroic' ? 1.3 : 1) - stats(p).defense),
  );
  p.hp = Math.max(0, p.hp - actual);
  a.invincible = 0.42;
  a.combo = 0;
  effect(a, { x: a.hero.x, y: a.hero.y - 125 }, 'damage', '#ffad9e', `−${actual}`);
  if (p.hp === 0) {
    a.outcome = 'lost';
    a.projectiles = [];
    a.warnings = [];
    a.notices.push('The ember endures. Your experience and equipment are safe.');
  }
}
function damageEnemy(a: Arena, shot: Projectile) {
  if (!a.enemy || a.outcome !== 'active') return;
  const amount = Math.round(shot.damage);
  a.enemy.hp = Math.max(0, a.enemy.hp - amount);
  a.enemy.flash = 0.18;
  a.combo++;
  a.enemy.stagger += shot.kind === 'flare' ? 35 : 12;
  effect(
    a,
    { x: a.enemy.x, y: a.enemy.y - (a.enemy.boss ? 180 : 85) },
    'damage',
    shot.kind === 'flare' ? '#ffdc98' : '#edf0d9',
    `${amount}`,
  );
  effect(
    a,
    { x: a.enemy.x, y: a.enemy.y - 65 },
    'burst',
    shot.kind === 'flare' ? '#ffd795' : '#d5f8f4',
  );
  if (a.enemy.stagger >= 100) {
    a.enemy.stagger = 0;
    a.enemyClock += 1.5;
    a.warnings = [];
    effect(a, { x: a.enemy.x, y: a.enemy.y - 220 }, 'damage', '#e6dbb2', 'STAGGER');
  }
  if (a.enemy.hp === 0) {
    a.outcome = 'won';
    a.projectiles = [];
    a.warnings = [];
  }
}
export function claimOutcome(p: Player, a: Arena): string[] {
  if (!['won', 'lost'].includes(a.outcome) || a.rewardClaimed) return [];
  a.rewardClaimed = true;
  if (a.outcome === 'lost') {
    const lost = Math.min(30, Math.floor(p.gold * 0.1));
    p.gold -= lost;
    rest(p);
    return [`Mira returns you to the sanctuary. ${lost} gold lost.`];
  }
  const enemy = a.enemy!;
  p.gold += enemy.gold;
  p.wins++;
  const levels = addXp(p, enemy.xp);
  p.focus = Math.min(100, p.focus + 20);
  if (enemy.boss && p.wardens === p.region) {
    p.wardens++;
    rest(p);
  }
  return [
    `+${enemy.xp} experience · +${enemy.gold} gold`,
    ...(levels ? [`Level ${p.level} reached. Your strength grows.`] : []),
  ];
}
function enemyAttack(a: Arena) {
  const e = a.enemy!;
  a.cycle++;
  if (a.cycle % 3 === 0) {
    a.warnings.push({
      x: e.x,
      y: e.y,
      end: { x: a.hero.x, y: a.hero.y },
      radius: 38,
      time: 1.15,
      duration: 1.15,
      damage: e.attack * 1.9,
      kind: 'line',
    });
  } else if (a.cycle % 2 === 0) {
    const count = e.boss ? 3 : 1;
    for (let i = 0; i < count; i++)
      a.warnings.push({
        x: Math.max(90, Math.min(920, a.hero.x + (i - (count - 1) / 2) * 115)),
        y: a.hero.y + (i === 1 ? -35 : 0),
        radius: e.boss ? 66 : 52,
        time: 1.15 + i * 0.13,
        duration: 1.15 + i * 0.13,
        damage: e.attack * 1.4,
        kind: 'circle',
      });
  } else {
    const angle = Math.atan2(a.hero.y - 40 - (e.y - 55), a.hero.x - e.x);
    const spread = e.boss ? [-0.23, 0, 0.23] : [0];
    for (const offset of spread) {
      const speed = e.boss ? 245 : 200;
      a.projectiles.push({
        x: e.x - 30,
        y: e.y - 55,
        vx: Math.cos(angle + offset) * speed,
        vy: Math.sin(angle + offset) * speed,
        radius: 14,
        damage: e.attack,
        owner: 'enemy',
        life: 5,
        kind: 'orb',
      });
    }
  }
}
function segmentDistance(p: Point, from: Point, to: Point): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = dx * dx + dy * dy;
  const t = length
    ? Math.max(0, Math.min(1, ((p.x - from.x) * dx + (p.y - from.y) * dy) / length))
    : 0;
  return distance(p, { x: from.x + t * dx, y: from.y + t * dy });
}
/** Simulation uses logical coordinates and a capped delta; it has no browser dependencies. */
export function step(
  p: Player,
  a: Arena,
  elapsed: number,
  movement: Point,
  settings: Settings,
): void {
  const dt = Math.max(0, Math.min(0.05, elapsed));
  if (!Number.isFinite(dt)) return;
  a.clock += dt;
  a.intro = Math.max(0, a.intro - dt);
  a.effects = a.effects.filter((f) => {
    f.life -= dt;
    return f.life > 0;
  });
  a.attackPose = Math.max(0, a.attackPose - dt);
  if (a.outcome === 'won' || a.outcome === 'lost') return;
  for (const key of Object.keys(a.cooldowns) as Action[])
    a.cooldowns[key] = Math.max(0, a.cooldowns[key] - dt);
  if (a.invincible > 0) {
    if (a.cooldowns.dash > 1.48) {
      a.hero.x += a.dashVector.x * 620 * dt;
      a.hero.y += a.dashVector.y * 430 * dt;
    }
    a.invincible = Math.max(0, a.invincible - dt);
  }
  let direction = { ...movement };
  if (Math.hypot(direction.x, direction.y) > 0) a.target = null;
  else if (a.target) {
    const d = distance(a.hero, a.target);
    if (d < 5) a.target = null;
    else direction = { x: (a.target.x - a.hero.x) / d, y: (a.target.y - a.hero.y) / d };
  }
  const length = Math.hypot(direction.x, direction.y);
  if (length > 0) {
    a.hero.x += (direction.x / Math.max(1, length)) * 215 * dt;
    a.hero.y += (direction.y / Math.max(1, length)) * 165 * dt;
    a.dashVector = { x: direction.x / length, y: direction.y / length };
    if (direction.x) a.facing = direction.x > 0 ? 1 : -1;
  }
  a.hero.x = Math.max(95, Math.min(905, a.hero.x));
  a.hero.y = Math.max(335, Math.min(525, a.hero.y));
  p.focus = Math.min(100, p.focus + dt * 5.5);
  if (a.outcome !== 'active' || !a.enemy || a.intro > 0) return;
  a.enemy.flash = Math.max(0, a.enemy.flash - dt);
  a.enemyClock -= dt;
  if (a.enemyClock <= 0) {
    enemyAttack(a);
    a.enemyClock = a.enemy.boss ? 1.85 : 2.25;
  }
  for (const warning of a.warnings) {
    warning.time -= dt;
    if (warning.time <= 0) {
      const hit =
        warning.kind === 'circle'
          ? Math.hypot(a.hero.x - warning.x, (a.hero.y - warning.y) / WARNING_DEPTH) <
            warning.radius
          : segmentDistance(a.hero, warning, warning.end!) < warning.radius;
      if (hit) damageHero(p, a, warning.damage, settings);
      effect(a, warning.kind === 'line' ? warning.end! : warning, 'burst', '#94e9e3');
    }
  }
  a.warnings = a.warnings.filter((w) => w.time > 0);
  for (const shot of [...a.projectiles]) {
    shot.x += shot.vx * dt;
    shot.y += shot.vy * dt;
    shot.life -= dt;
    if (
      shot.owner === 'hero' &&
      distance(shot, { x: a.enemy.x, y: a.enemy.y - 45 }) < shot.radius + 40
    ) {
      damageEnemy(a, shot);
      shot.life = 0;
    } else if (
      shot.owner === 'enemy' &&
      distance(shot, { x: a.hero.x, y: a.hero.y - 40 }) < shot.radius + 15
    ) {
      damageHero(p, a, shot.damage, settings);
      shot.life = 0;
    }
  }
  a.projectiles = a.projectiles.filter(
    (s) => s.life > 0 && s.x > -50 && s.x < 1050 && s.y > -50 && s.y < 650,
  );
}
