import {
  DEFAULT_SETTINGS,
  newPlayer,
  stats,
  xpToNext,
  type Player,
  type Save,
  type Settings,
} from './model';
const KEY = 'emberfall.save.v1';
const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const bounded = (v: unknown, min: number, max: number, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v)
    ? Math.max(min, Math.min(max, Math.floor(v)))
    : fallback;
export function parseSave(raw: string): Save {
  if (raw.length > 100_000) throw new Error('Save file is too large.');
  const data: unknown = JSON.parse(raw);
  if (!object(data) || data.version !== 1 || !object(data.player))
    throw new Error('This is not a compatible Emberfall save.');
  const source = data.player;
  const p: Player = newPlayer();
  p.level = bounded(source.level, 1, 99, 1);
  p.xp = bounded(source.xp, 0, xpToNext(p.level) - 1, 0);
  for (const key of ['gold', 'kills'] as const) p[key] = bounded(source[key], 0, 9_999_999, p[key]);
  for (const key of ['weapon', 'armor'] as const) p[key] = bounded(source[key], 0, 25, 0);
  p.potions = bounded(source.potions, 0, 99, 3);
  p.bosses = Array.isArray(source.bosses)
    ? [
        ...new Set(
          source.bosses.filter((b): b is 'guardian' | 'sentinel' | 'eclipse' =>
            ['guardian', 'sentinel', 'eclipse'].includes(b),
          ),
        ),
      ]
    : [];
  // Progress must form a contiguous chain; imported saves cannot strand the player.
  if (!p.bosses.includes('guardian')) p.bosses = [];
  else if (!p.bosses.includes('sentinel')) p.bosses = ['guardian'];
  p.region = bounded(source.region, 0, Math.min(2, p.bosses.length), 0) as Player['region'];
  p.hp = bounded(source.hp, 1, stats(p).maxHp, stats(p).maxHp);
  p.mp = bounded(source.mp, 0, stats(p).maxMp, stats(p).maxMp);
  p.x = bounded(source.x, 2, 45, 11);
  p.y = bounded(source.y, 3, 24, 17);
  p.seen = Array.isArray(source.seen)
    ? source.seen.filter(
        (s): s is string =>
          typeof s === 'string' && ['awakening', 'tide', 'summit', 'ending'].includes(s),
      )
    : [];
  p.claimedBounty = source.claimedBounty === true;
  const cfg = object(data.settings) ? data.settings : {};
  const settings: Settings = { ...DEFAULT_SETTINGS };
  for (const k of ['music', 'sfx', 'reducedMotion'] as const)
    if (typeof cfg[k] === 'boolean') settings[k] = cfg[k];
  if (cfg.difficulty === 'heroic') settings.difficulty = 'heroic';
  if (typeof cfg.volume === 'number' && Number.isFinite(cfg.volume))
    settings.volume = Math.max(0, Math.min(1, cfg.volume));
  return {
    version: 1,
    player: p,
    settings,
    savedAt: bounded(data.savedAt, 0, Number.MAX_SAFE_INTEGER, Date.now()),
  };
}
export function serialize(p: Player, settings: Settings): string {
  return JSON.stringify({ version: 1, player: p, settings, savedAt: Date.now() }, null, 2);
}
export function readSave(): Save | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? parseSave(raw) : null;
  } catch {
    return null;
  }
}
export function writeSave(p: Player, settings: Settings): boolean {
  try {
    localStorage.setItem(KEY, serialize(p, settings));
    return true;
  } catch {
    return false;
  }
}
