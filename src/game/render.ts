import { REGIONS, type EnemyKind } from './data';
import { type Battle, type Player } from './model';
import { HEIGHT, noise, TILE, WIDTH, type World } from './world';
const P = [
  '            ',
  '    HHHH    ',
  '   HHHHHH   ',
  '   HLHLHH   ',
  '   SSSSH    ',
  '    SS      ',
  '  RRRRRRR   ',
  '  ARRAR  R  ',
  '  AAAA    R ',
  ' SAAAAS   C ',
  '  BBBB    C ',
  '  BB BB   C ',
  '  DD DD     ',
];
const palette: Record<string, string> = {
  H: '#d2d5c9',
  L: '#f5edd3',
  S: '#e6b591',
  R: '#d77e4f',
  A: '#344555',
  B: '#27333e',
  D: '#171e27',
  C: '#c3d1c5',
};
function rect(
  c: CanvasRenderingContext2D,
  color: string,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  c.fillStyle = color;
  c.fillRect(Math.floor(x), Math.floor(y), w, h);
}
export function drawHero(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale = 2,
  frame = 0,
): void {
  c.save();
  c.translate(Math.round(x), Math.round(y));
  c.scale(scale, scale);
  c.fillStyle = '#07171488';
  c.beginPath();
  c.ellipse(0, 0, 5, 2, 0, 0, Math.PI * 2);
  c.fill();
  P.forEach((row, dy) =>
    [...row].forEach((v, dx) => {
      if (palette[v])
        rect(c, palette[v], dx - 6, dy - 12 + (dy > 9 && frame % 2 ? (dx < 6 ? 1 : -1) : 0), 1, 1);
    }),
  );
  c.restore();
}
export function drawEnemy(
  c: CanvasRenderingContext2D,
  kind: EnemyKind,
  x: number,
  y: number,
  scale = 1,
  time = 0,
): void {
  c.save();
  c.translate(Math.round(x), Math.round(y));
  c.scale(scale, scale);
  c.fillStyle = '#08161688';
  c.beginPath();
  c.ellipse(0, 0, 10, 3, 0, 0, Math.PI * 2);
  c.fill();
  const bob = Math.round(Math.sin(time / 350) * 1.5);
  if (kind === 'slime') {
    rect(c, '#325c50', -10, -10 + bob, 20, 9);
    rect(c, '#69a574', -8, -13 + bob, 16, 12);
    rect(c, '#8ac58b', -5, -16 + bob, 9, 5);
    rect(c, '#b5d999', -4, -14 + bob, 4, 2);
    rect(c, '#182f34', -4, -8 + bob, 2, 3);
    rect(c, '#182f34', 4, -8 + bob, 2, 3);
    rect(c, '#bddca3', -9, -5 + bob, 2, 2);
    rect(c, '#caa2d5', 1, -20 + bob, 3, 5);
    rect(c, '#e3b8e6', -1, -20 + bob, 7, 2);
  } else if (kind === 'wolf') {
    rect(c, '#5d7180', -10, -12, 19, 8);
    rect(c, '#829aa4', -8, -15, 15, 7);
    rect(c, '#a4b9b8', -12, -18, 9, 9);
    rect(c, '#abbcc4', -13, -24, 3, 8);
    rect(c, '#768c9c', -7, -22, 3, 5);
    rect(c, '#465966', -10, -5, 3, 5);
    rect(c, '#465966', 4, -5, 3, 5);
    rect(c, '#849fa4', 9, -16, 7, 4);
    rect(c, '#b9ccca', 13, -20, 4, 5);
    rect(c, '#e4b374', -12, -14, 2, 2);
    rect(c, '#283843', -15, -12, 4, 3);
  } else if (kind === 'wisp') {
    rect(c, '#398c9277', -9, -20 + bob, 18, 17);
    rect(c, '#61bfc0', -6, -22 + bob, 12, 15);
    rect(c, '#b0eddf', -3, -19 + bob, 6, 8);
    rect(c, '#c8fff0', -1, -18 + bob, 3, 5);
    rect(c, '#7dd1ce', -3, -8 + bob, 3, 8);
    rect(c, '#428f9b', 4, -5 + bob, 3, 4);
    rect(c, '#1e4e64', -4, -17 + bob, 2, 2);
    rect(c, '#1e4e64', 3, -17 + bob, 2, 2);
  } else {
    const colors =
      kind === 'guardian'
        ? ['#4f6852', '#77936b', '#bbc597']
        : kind === 'sentinel'
          ? ['#425d78', '#74a4b6', '#b9ece1']
          : ['#514663', '#95819f', '#ded0d9'];
    rect(c, colors[0], -13, -37, 26, 29);
    rect(c, colors[1], -9, -40, 18, 20);
    rect(c, colors[0], -19, -33, 7, 21);
    rect(c, colors[0], 12, -33, 7, 21);
    rect(c, colors[2], -7, -42, 14, 9);
    rect(c, colors[0], -9, -50, 4, 13);
    rect(c, colors[0], 5, -50, 4, 13);
    rect(c, '#ebbd76', -5, -37, 3, 3);
    rect(c, '#ebbd76', 3, -37, 3, 3);
    rect(c, '#183433', -4, -29, 9, 16);
    rect(c, kind === 'eclipse' ? '#d79df0' : '#a9e4d8', -2, -25, 5, 7);
    rect(c, colors[0], -11, -10, 7, 10);
    rect(c, colors[0], 4, -10, 7, 10);
    rect(c, colors[2], -17, -32, 3, 8);
    rect(c, colors[2], 15, -32, 3, 8);
  }
  c.restore();
}
function tree(c: CanvasRenderingContext2D, x: number, y: number, variant: number, region: number) {
  c.fillStyle = '#071c1b44';
  c.beginPath();
  c.ellipse(x + 4, y + 2, 21, 7, 0, 0, Math.PI * 2);
  c.fill();
  rect(c, '#383c2b', x - 4, y - 24, 9, 25);
  rect(c, '#71684a', x, y - 20, 3, 20);
  rect(c, '#2b3b2b', x - 7, y - 3, 14, 4);
  const colors =
    region === 0
      ? ['#183a32', '#214b3c', '#305b43', '#426b4d', '#64815a']
      : region === 1
        ? ['#19353d', '#244c50', '#346369', '#497776', '#669491']
        : ['#302d43', '#464059', '#5b506c', '#766280', '#9a839d'];
  const wide = variant === 1 ? 4 : 0;
  for (let layer = 0; layer < 3; layer++) {
    const yy = y - 15 - layer * 12;
    const ww = 25 - layer * 5 + wide;
    rect(c, colors[0], x - ww, yy - 5, ww * 2, 9);
    rect(c, colors[1], x - ww + 3, yy - 14, ww * 2 - 6, 15);
    rect(c, colors[2], x - ww + 7, yy - 19, ww * 2 - 14, 17);
    rect(c, colors[3], x - ww + 8, yy - 18, ww - 3, 5);
    rect(c, colors[3], x - ww + 4, yy - 10, ww - 7, 4);
    rect(c, colors[4], x - ww + 8, yy - 17, 5, 2);
    for (let i = 0; i < 9; i++) {
      const xx = x - ww + noise(i, layer, variant) * ww * 2;
      rect(c, colors[1 + (i % 3)], xx, yy - noise(i, 5, layer) * 11, 3, 2);
    }
  }
}
function camp(c: CanvasRenderingContext2D) {
  const x = 7 * TILE;
  const y = 16 * TILE;
  rect(c, '#263d33', x - 34, y + 9, 57, 7);
  for (let i = 0; i < 28; i++)
    rect(c, i < 16 ? '#956e48' : '#74543e', x - 28 + i, y - 25 + i, (28 - i) * 2, 1);
  for (let i = 0; i < 25; i++) rect(c, '#b89463', x - 26 + i, y - 25 + i, 4, 1);
  rect(c, '#342e2b', x - 6, y - 7, 13, 17);
  rect(c, '#d4b984', x - 2, y - 28, 2, 38);
  rect(c, '#604b37', x + 24, y, 13, 10);
  rect(c, '#a68658', x + 23, y, 15, 3);
  rect(c, '#665841', 10 * TILE - 2, 12 * TILE - 18, 4, 21);
  rect(c, '#b1a176', 10 * TILE - 12, 12 * TILE - 15, 27, 13);
  rect(c, '#665c45', 10 * TILE - 7, 12 * TILE - 11, 16, 2);
}
export class Renderer {
  private c: CanvasRenderingContext2D;
  private terrain = document.createElement('canvas');
  private battleBackground = document.createElement('canvas');
  world: World;
  constructor(
    readonly canvas: HTMLCanvasElement,
    world: World,
  ) {
    this.c = canvas.getContext('2d', { alpha: false })!;
    this.c.imageSmoothingEnabled = false;
    this.world = world;
    this.rebuild(world);
  }
  rebuild(world: World): void {
    this.world = world;
    this.terrain.width = WIDTH * TILE;
    this.terrain.height = HEIGHT * TILE;
    const c = this.terrain.getContext('2d')!;
    const r = REGIONS[world.region];
    for (let y = 0; y < HEIGHT; y++)
      for (let x = 0; x < WIDTH; x++) {
        const kind = world.tiles[y][x];
        const xx = x * TILE;
        const yy = y * TILE;
        rect(
          c,
          kind === 'water'
            ? r.water
            : kind === 'path'
              ? r.path
              : kind === 'bridge'
                ? '#715c3f'
                : kind === 'stone'
                  ? '#636958'
                  : r.grass,
          xx,
          yy,
          TILE,
          TILE,
        );
        for (let i = 0; i < 8; i++) {
          const a = Math.floor(noise(x + i, y, 3) * 16);
          const b = Math.floor(noise(x, y + i, 2) * 16);
          if (kind === 'grass') {
            rect(c, i % 2 ? r.light : r.dark, xx + a, yy + b, 2, i % 3 ? 1 : 3);
            if (i === 2 && noise(x, y) > 0.84) {
              rect(c, '#b4b398', xx + a, yy + b, 1, 2);
              rect(c, '#91a780', xx + a - 1, yy + b + 2, 3, 1);
            }
          } else if (kind === 'water') rect(c, '#77b1ae33', xx + a, yy + b, 4, 1);
          else if (kind === 'path')
            rect(c, i % 2 ? '#ac997144' : '#4b583344', xx + a, yy + b, 2, 1);
        }
        if (kind === 'stone') {
          rect(c, '#3c5047', xx, yy, 16, 1);
          rect(c, '#3c5047', xx, yy, 1, 16);
          rect(c, '#89907a', xx + 2, yy + 2, 12, 1);
        }
        if (kind === 'bridge') {
          for (let i = 0; i < 16; i += 4) {
            rect(c, '#aa8c5b', xx, yy + i, 16, 2);
            rect(c, '#463f34', xx, yy + i + 3, 16, 1);
          }
        }
      }
    // Stones, fern clusters, and flowers give the forest a hand-placed feel.
    for (let i = 0; i < 180; i++) {
      const x = Math.floor(noise(i, 7) * WIDTH);
      const y = Math.floor(noise(i, 19) * HEIGHT);
      if (world.tiles[y][x] !== 'grass') continue;
      const xx = x * TILE + 8;
      const yy = y * TILE + 8;
      if (i % 4 === 0) {
        rect(c, '#526355', xx - 4, yy - 3, 8, 5);
        rect(c, '#809077', xx - 2, yy - 5, 6, 3);
        rect(c, '#374b40', xx - 5, yy + 2, 11, 2);
      } else if (i % 4 === 1) {
        for (const dx of [-3, 1, 4]) {
          rect(c, '#779072', xx + dx, yy, 1, 4);
          rect(c, world.region === 2 ? '#c4a1cd' : '#c9caaa', xx + dx - 1, yy - 1, 3, 2);
        }
      } else {
        rect(c, r.light, xx, yy - 4, 1, 6);
        rect(c, r.light, xx - 3, yy - 2, 7, 1);
        rect(c, r.light, xx - 2, yy - 3, 5, 1);
      }
    }
    camp(c);
    // An ancient arch, broken columns, and rune-lined steps.
    for (const x of [38, 44]) {
      rect(c, '#293f3e', x * TILE - 7, 8 * TILE - 27, 15, 40);
      rect(c, '#a0a38a', x * TILE - 6, 8 * TILE - 30, 12, 37);
      rect(c, '#707e6f', x * TILE, 8 * TILE - 30, 6, 37);
      rect(c, '#c0bca0', x * TILE - 8, 8 * TILE - 33, 16, 5);
    }
    rect(c, '#55695c', 39 * TILE, 5 * TILE, 65, 9);
    rect(c, '#b1b39a', 39 * TILE, 5 * TILE - 2, 65, 3);
    rect(c, '#a1bfa5', 40 * TILE, 10 * TILE, 48, 3);
    world.trees
      .sort((a, b) => a.y - b.y)
      .forEach((t) => tree(c, t.x * TILE, t.y * TILE, t.variant, world.region));
    this.battleBackground.width = WIDTH * TILE;
    this.battleBackground.height = HEIGHT * TILE;
    const b = this.battleBackground.getContext('2d')!;
    b.fillStyle = '#142d2a';
    b.fillRect(0, 0, WIDTH * TILE, HEIGHT * TILE);
    for (let i = 0; i < 30; i++) tree(b, i * 29, 110 + noise(i, 7) * 85, i % 3, world.region);
    for (let y = 180; y < HEIGHT * TILE; y += 4)
      rect(b, y < 210 ? '#314b3b' : r.grass, 0, y, WIDTH * TILE, 4);
    for (let i = 0; i < 400; i++)
      rect(b, i % 2 ? r.light : r.dark, noise(i, 1) * 768, 205 + noise(i, 2) * 240, 5, 2);
    b.fillStyle = '#d6be7330';
    b.beginPath();
    b.ellipse(390, 280, 280, 38, 0, 0, Math.PI * 2);
    b.fill();
  }
  draw(
    p: Player,
    battle: Battle | null,
    time: number,
    reduced: boolean,
    position: { x: number; y: number },
    moving: boolean,
    target: { x: number; y: number } | null,
  ): void {
    const c = this.c;
    const t = reduced ? 0 : time;
    const w = this.canvas.width;
    const h = this.canvas.height;
    c.clearRect(0, 0, w, h);
    c.drawImage(battle ? this.battleBackground : this.terrain, 0, 0);
    if (battle) {
      const compact = this.canvas.clientWidth / this.canvas.clientHeight < 1.5;
      const consoleHeight = document.querySelector('.battle-console')?.clientHeight ?? 0;
      const scale = Math.max(this.canvas.clientWidth / w, this.canvas.clientHeight / h);
      const floor = Math.min(285, h - (consoleHeight + 14) / scale);
      drawHero(c, compact ? 270 : 220, floor, 5, 0);
      drawEnemy(c, battle.kind, compact ? 498 : 542, floor, 4, t);
      const glow = c.createRadialGradient(390, 200, 30, 390, 200, 340);
      glow.addColorStop(0, '#b3c39d0a');
      glow.addColorStop(1, '#020c1444');
      c.fillStyle = glow;
      c.fillRect(0, 0, w, h);
    } else {
      for (const e of this.world.entities) {
        if (e.cleared) continue;
        const x = e.x * TILE + 8;
        const y = e.y * TILE + 8;
        if (e.type === 'enemy') drawEnemy(c, e.kind!, x, y, 1, t + x);
        if (e.type === 'gate') {
          const glow = c.createRadialGradient(x, y - 18, 2, x, y - 18, 45);
          glow.addColorStop(0, '#88ebcc55');
          glow.addColorStop(1, '#88ebcc00');
          c.fillStyle = glow;
          c.fillRect(x - 45, y - 63, 90, 90);
          drawEnemy(c, e.kind!, x, y, 1, t);
        }
        if (e.type === 'chest') {
          rect(c, '#382f28', x - 8, y - 7, 17, 10);
          rect(c, '#aa7951', x - 8, y - 10, 17, 7);
          rect(c, '#ddbe7d', x - 6, y - 9, 2, 11);
          rect(c, '#ddbe7d', x + 5, y - 9, 2, 11);
          rect(c, '#ead699', x - 1, y - 5, 3, 4);
        }
        if (e.type === 'camp') {
          const glow = c.createRadialGradient(x, y - 3, 0, x, y - 3, 60);
          glow.addColorStop(0, '#f9b66740');
          glow.addColorStop(1, '#f9b66700');
          c.fillStyle = glow;
          c.fillRect(x - 60, y - 63, 120, 120);
          rect(c, '#44352c', x - 7, y - 1, 14, 4);
          rect(c, '#e79449', x - 5, y - 9, 10, 9);
          rect(c, '#ffcb75', x - 3, y - 14 - Math.round(Math.sin(t / 170) * 2), 6, 12);
          rect(c, '#fff2b1', x - 1, y - 9, 3, 8);
        }
        if (e.type === 'forge') {
          rect(c, '#303739', x - 6, y - 9, 13, 10);
          rect(c, '#a4a997', x - 11, y - 12, 24, 4);
          rect(c, '#68786f', x - 4, y - 3, 9, 6);
        }
      }
      if (target) {
        c.strokeStyle = '#d8cc9b88';
        c.strokeRect(target.x * TILE + 3, target.y * TILE + 3, 10, 10);
      }
      drawHero(
        c,
        position.x * TILE + 8,
        position.y * TILE + 8,
        1.7,
        moving ? Math.floor(t / 120) : 0,
      );
      // Small world labels remain legible at every display scale.
      c.font = '8px monospace';
      c.textAlign = 'center';
      for (const [label, x, y] of [
        ['CAMP', 8, 20],
        ['FORGE', 9, 14],
        ['WARDEN', 41, 12],
      ] as const) {
        c.fillStyle = '#0c201bba';
        c.fillRect(x * TILE - 25, y * TILE - 8, 50, 13);
        c.fillStyle = '#d7d9b9';
        c.fillText(label, x * TILE, y * TILE + 1);
      }
    }
    for (let i = 0; i < 40; i++) {
      const xx = noise(i, 1) * w + Math.sin(t / 2800 + i) * 10;
      const yy = (noise(i, 2) * h - (t / 180) * (0.4 + noise(i, 9)) + h * 100) % h;
      c.globalAlpha = 0.2 + (Math.sin(t / 650 + i) + 1) * 0.3;
      rect(c, i % 3 ? '#d3d89a' : '#a4e6d5', xx, yy, i % 4 ? 1 : 2, i % 4 ? 1 : 2);
    }
    c.globalAlpha = 1;
    const vignette = c.createRadialGradient(w / 2, h / 2, 100, w / 2, h / 2, w / 1.45);
    vignette.addColorStop(0, '#03161500');
    vignette.addColorStop(1, '#031615aa');
    c.fillStyle = vignette;
    c.fillRect(0, 0, w, h);
    if (!battle && p.hp < 30) {
      c.strokeStyle = '#c4775660';
      c.lineWidth = 6;
      c.strokeRect(0, 0, w, h);
    }
  }
}
