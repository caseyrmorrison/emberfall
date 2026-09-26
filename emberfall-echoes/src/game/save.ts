import { INITIAL_SETTINGS, newPlayer, stats, xpNeeded, type Player, type Settings } from './model';
import type { RegionId } from './content';
export const SAVE_KEY = 'emberfall.echoes.v1';
interface Save {
  game: 'emberfall-echoes';
  version: 1;
  player: Player;
  settings: Settings;
  savedAt: number;
}
const record = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const number = (v: unknown, min: number, max: number, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v)
    ? Math.max(min, Math.min(max, Math.floor(v)))
    : fallback;
export function parseSave(raw: string): Save {
  if (raw.length > 100_000) throw new Error('The save file is too large.');
  const source: unknown = JSON.parse(raw);
  if (
    !record(source) ||
    source.game !== 'emberfall-echoes' ||
    source.version !== 1 ||
    !record(source.player)
  )
    throw new Error('This is not an Echoes of the Moon save.');
  const data = source.player;
  const player = newPlayer();
  player.level = number(data.level, 1, 99, 1);
  player.xp = number(data.xp, 0, xpNeeded(player.level) - 1, 0);
  player.gold = number(data.gold, 0, 9_999_999, 45);
  player.wins = number(data.wins, 0, 9_999_999, 0);
  player.wardens = number(data.wardens, 0, 3, 0);
  player.region = number(data.region, 0, Math.min(2, player.wardens), 0) as RegionId;
  player.weapon = number(data.weapon, 0, 25, 0);
  player.armor = number(data.armor, 0, 25, 0);
  player.hp = number(data.hp, 1, stats(player).hp, stats(player).hp);
  player.focus = number(data.focus, 0, 100, 100);
  player.tonics = number(data.tonics, 0, 99, 3);
  for (const field of ['memories', 'treasures'] as const) {
    const values = data[field];
    player[field] = Array.isArray(values)
      ? [...new Set(values.filter((x): x is RegionId => x === 0 || x === 1 || x === 2))]
      : [];
  }
  player.seen = Array.isArray(data.seen)
    ? data.seen.filter((x): x is string => ['prologue', 'roots', 'water', 'crown'].includes(x))
    : [];
  const cfg = record(source.settings) ? source.settings : {};
  const settings = { ...INITIAL_SETTINGS };
  for (const field of ['music', 'effects', 'reducedMotion'] as const)
    if (typeof cfg[field] === 'boolean') settings[field] = cfg[field];
  if (typeof cfg.volume === 'number' && Number.isFinite(cfg.volume))
    settings.volume = Math.max(0, Math.min(1, cfg.volume));
  if (cfg.difficulty === 'heroic') settings.difficulty = 'heroic';
  return {
    game: 'emberfall-echoes',
    version: 1,
    player,
    settings,
    savedAt: number(source.savedAt, 0, Number.MAX_SAFE_INTEGER, Date.now()),
  };
}
export const serialize = (player: Player, settings: Settings) =>
  JSON.stringify(
    { game: 'emberfall-echoes', version: 1, player, settings, savedAt: Date.now() },
    null,
    2,
  );
export function load(): Save | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? parseSave(raw) : null;
  } catch {
    return null;
  }
}
export function persist(player: Player, settings: Settings): boolean {
  try {
    localStorage.setItem(SAVE_KEY, serialize(player, settings));
    return true;
  } catch {
    return false;
  }
}
