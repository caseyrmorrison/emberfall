import { REGIONS, type EnemyKind, type RegionId } from './data';
export const TILE = 16;
export const WIDTH = 48;
export const HEIGHT = 27;
export type Tile = 'grass' | 'path' | 'water' | 'bridge' | 'stone';
export interface Entity {
  id: string;
  x: number;
  y: number;
  type: 'enemy' | 'camp' | 'forge' | 'chest' | 'gate';
  kind?: EnemyKind;
  cleared?: boolean;
}
export interface World {
  tiles: Tile[][];
  entities: Entity[];
  region: RegionId;
  trees: { x: number; y: number; variant: number }[];
}
export const noise = (x: number, y: number, seed = 0): number => {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return n - Math.floor(n);
};
export function makeWorld(region: RegionId): World {
  const tiles: Tile[][] = Array.from({ length: HEIGHT }, () => Array<Tile>(WIDTH).fill('grass'));
  const entities: Entity[] = [
    { id: 'camp', x: 8, y: 17, type: 'camp' },
    { id: 'forge', x: 9, y: 12, type: 'forge' },
    { id: 'chest', x: 22, y: 7, type: 'chest' },
    { id: 'gate', x: 41, y: 8, type: 'gate', kind: REGIONS[region].boss },
    { id: 'm1', x: 18, y: 17, type: 'enemy', kind: 'slime' },
    { id: 'm2', x: 23, y: 20, type: 'enemy', kind: 'slime' },
    { id: 'm3', x: 27, y: 14, type: 'enemy', kind: 'wolf' },
    { id: 'm4', x: 19, y: 10, type: 'enemy', kind: 'wisp' },
    { id: 'm5', x: 36, y: 16, type: 'enemy', kind: 'wolf' },
    { id: 'm6', x: 40, y: 21, type: 'enemy', kind: 'wisp' },
    { id: 'm7', x: 27, y: 6, type: 'enemy', kind: 'slime' },
    { id: 'm8', x: 38, y: 10, type: 'enemy', kind: 'wolf' },
  ];
  for (let y = 0; y < HEIGHT; y++)
    for (let x = 0; x < WIDTH; x++) {
      const center = 32 + Math.round(Math.sin(y / 4) * 1.4);
      if (Math.abs(x - center) < 2) tiles[y][x] = 'water';
      if (
        (Math.abs(y - (17 - Math.sin((x - 10) / 6) * 2.5)) < 1.7 && x > 5 && x < 43) ||
        (x >= 39 && x <= 41 && y >= 8 && y < 19)
      )
        tiles[y][x] = tiles[y][x] === 'water' ? 'bridge' : 'path';
      if ((x - 8) ** 2 + (y - 17) ** 2 < 16) tiles[y][x] = 'path';
      if (x >= 38 && x <= 44 && y >= 5 && y <= 10) tiles[y][x] = 'stone';
    }
  const trees: World['trees'] = [];
  for (let y = 1; y < HEIGHT; y++)
    for (let x = 1; x < WIDTH; x++) {
      const edge = y < 4 || y > 24 || x < 3 || x > 45;
      if (
        tiles[y][x] === 'grass' &&
        (edge ? noise(x, y) > 0.44 : noise(x, y, 12) > 0.92) &&
        !entities.some((e) => Math.hypot(e.x - x, e.y - y) < 2.8) &&
        Math.hypot(11 - x, 17 - y) > 2
      )
        trees.push({ x, y, variant: Math.floor(noise(x, y, 1) * 3) });
    }
  return { tiles, entities, region, trees };
}
export function walkable(w: World, x: number, y: number): boolean {
  return (
    x >= 2 &&
    y >= 3 &&
    x < WIDTH - 2 &&
    y < HEIGHT - 2 &&
    w.tiles[y][x] !== 'water' &&
    !w.trees.some((t) => t.x === x && t.y === y)
  );
}
export function findPath(
  w: World,
  start: { x: number; y: number },
  goal: { x: number; y: number },
): { x: number; y: number }[] {
  if (!walkable(w, goal.x, goal.y)) return [];
  const key = (x: number, y: number) => `${x},${y}`;
  const queue = [start];
  const parent = new Map<string, { x: number; y: number } | null>([[key(start.x, start.y), null]]);
  for (let i = 0; i < queue.length; i++) {
    const cur = queue[i];
    if (cur.x === goal.x && cur.y === goal.y) {
      const result = [];
      let node = cur;
      while (parent.get(key(node.x, node.y))) {
        result.push(node);
        node = parent.get(key(node.x, node.y))!;
      }
      return result.reverse();
    }
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const x = cur.x + dx;
      const y = cur.y + dy;
      if (walkable(w, x, y) && !parent.has(key(x, y))) {
        parent.set(key(x, y), cur);
        queue.push({ x, y });
      }
    }
  }
  return [];
}
