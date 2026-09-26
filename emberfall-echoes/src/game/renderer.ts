import { REGIONS } from './content';
import { WARNING_DEPTH, type Arena, type Player, type Settings } from './model';

export interface Assets {
  clearing: HTMLImageElement;
  hero: HTMLImageElement;
  warden: HTMLImageElement;
}
export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load ${url}`));
    image.src = url;
  });
}
function cover(c: CanvasRenderingContext2D, image: HTMLImageElement, w: number, h: number) {
  const ratio = Math.max(w / image.width, h / image.height);
  const iw = image.width * ratio;
  const ih = image.height * ratio;
  c.drawImage(image, (w - iw) / 2, (h - ih) / 2, iw, ih);
}
export class Renderer {
  private c: CanvasRenderingContext2D;
  constructor(
    private canvas: HTMLCanvasElement,
    private assets: Assets,
  ) {
    this.c = canvas.getContext('2d', { alpha: false })!;
  }
  draw(player: Player, arena: Arena, settings: Settings, time: number): void {
    const c = this.c;
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    if (width < 1 || height < 1) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (
      this.canvas.width !== Math.round(width * dpr) ||
      this.canvas.height !== Math.round(height * dpr)
    ) {
      this.canvas.width = Math.round(width * dpr);
      this.canvas.height = Math.round(height * dpr);
    }
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.imageSmoothingEnabled = true;
    c.imageSmoothingQuality = 'high';
    cover(c, this.assets.clearing, width, height);
    if (player.region > 0) {
      c.fillStyle = player.region === 1 ? '#123a6355' : '#4c245b55';
      c.globalCompositeOperation = 'color';
      c.fillRect(0, 0, width, height);
      c.globalCompositeOperation = 'source-over';
    }
    const vignette = c.createRadialGradient(
      width / 2,
      height / 2,
      height * 0.18,
      width / 2,
      height / 2,
      width * 0.72,
    );
    vignette.addColorStop(0, '#03111900');
    vignette.addColorStop(1, '#031119ad');
    c.fillStyle = vignette;
    c.fillRect(0, 0, width, height);
    const sx = width / 1000;
    const sy = height / 600;
    c.setTransform(sx * dpr, 0, 0, sy * dpr, 0, 0);
    const t = settings.reducedMotion ? 0 : time;
    const color = REGIONS[player.region].color;
    for (const warning of arena.warnings) {
      c.save();
      const progress = 1 - warning.time / warning.duration;
      c.strokeStyle = '#ffd6a2';
      c.lineWidth = 2;
      c.shadowColor = '#eaa963';
      c.shadowBlur = 12;
      c.fillStyle = `rgba(236, 160, 104, ${0.07 + progress * 0.24})`;
      if (warning.kind === 'circle') {
        c.beginPath();
        c.ellipse(
          warning.x,
          warning.y,
          warning.radius,
          warning.radius * WARNING_DEPTH,
          0,
          0,
          Math.PI * 2,
        );
        c.fill();
        c.stroke();
        c.beginPath();
        c.ellipse(
          warning.x,
          warning.y,
          warning.radius * progress,
          warning.radius * progress * WARNING_DEPTH,
          0,
          0,
          Math.PI * 2,
        );
        c.stroke();
      } else {
        c.lineWidth = warning.radius * 2;
        c.lineCap = 'round';
        c.strokeStyle = '#ecaa7455';
        c.beginPath();
        c.moveTo(warning.x, warning.y);
        c.lineTo(warning.end!.x, warning.end!.y);
        c.stroke();
        c.lineWidth = 2;
        c.strokeStyle = '#ffd6a2';
        c.setLineDash([10, 10]);
        c.stroke();
      }
      c.restore();
    }
    if (arena.target && arena.outcome === 'exploring') {
      c.strokeStyle = '#cae7d7a0';
      c.lineWidth = 1.5;
      c.beginPath();
      c.ellipse(arena.target.x, arena.target.y, 10, 5, 0, 0, Math.PI * 2);
      c.stroke();
    }
    const heroHeight = width < 650 ? 160 : 220;
    const bob = Math.sin(t / 650) * 2;
    const lean = settings.reducedMotion ? 0 : arena.attackPose * 0.2 * arena.facing;
    this.shadow(arena.hero.x, arena.hero.y, width < 650 ? 38 : 44, 0.36);
    c.save();
    c.translate(arena.hero.x, arena.hero.y + bob);
    c.scale(arena.facing, 1);
    c.rotate(lean);
    if (arena.invincible > 0) {
      c.globalAlpha = 0.65 + Math.sin(t / 40) * 0.2;
      c.shadowColor = '#c3f1ed';
      c.shadowBlur = 16;
    }
    const heroWidth = (((heroHeight * this.assets.hero.width) / this.assets.hero.height) * sy) / sx;
    c.drawImage(this.assets.hero, -heroWidth / 2, -heroHeight, heroWidth, heroHeight);
    c.restore();
    if (arena.enemy && arena.outcome !== 'lost') {
      const e = arena.enemy;
      if (e.boss) {
        const h =
          width < 650
            ? Math.min(
                225,
                (450 * sx * this.assets.warden.height) / (sy * this.assets.warden.width),
              )
            : 290;
        const w = (((h * this.assets.warden.width) / this.assets.warden.height) * sy) / sx;
        this.shadow(e.x, e.y, 85, 0.38);
        c.save();
        if (arena.outcome === 'won') c.globalAlpha = 0.32;
        c.filter =
          e.flash > 0
            ? 'brightness(1.8)'
            : player.region
              ? `hue-rotate(${player.region * 45}deg)`
              : 'none';
        c.drawImage(this.assets.warden, e.x - w / 2, e.y - h + Math.sin(t / 800) * 2, w, h);
        c.restore();
      } else {
        const x = e.x;
        const y = e.y - 50 + Math.sin(t / 500) * 9;
        this.shadow(x, e.y, 32, 0.15);
        c.save();
        if (arena.outcome === 'won') c.globalAlpha = 0.2;
        const glow = c.createRadialGradient(x, y, 1, x, y, 85);
        glow.addColorStop(0, '#d4ffffc0');
        glow.addColorStop(0.2, `${color}90`);
        glow.addColorStop(1, '#a0e7f000');
        c.fillStyle = glow;
        c.fillRect(x - 85, y - 85, 170, 170);
        c.strokeStyle = color;
        c.lineWidth = 1.1;
        c.shadowColor = color;
        c.shadowBlur = 12;
        for (let ring = 0; ring < 3; ring++) {
          c.beginPath();
          c.ellipse(x, y, 29 + ring * 5, 17 + ring * 4, t / 2500 + ring * 1.05, 0, Math.PI * 2);
          c.stroke();
        }
        c.fillStyle = '#e3fff7';
        c.beginPath();
        c.moveTo(x, y - 24);
        c.quadraticCurveTo(x + 19, y, x, y + 22);
        c.quadraticCurveTo(x - 19, y, x, y - 24);
        c.fill();
        c.restore();
      }
    }
    for (const shot of arena.projectiles) {
      c.save();
      const color = shot.kind === 'orb' ? '#a5e7f2' : shot.kind === 'flare' ? '#ffd493' : '#ffefce';
      c.shadowBlur = 22;
      c.shadowColor = color;
      c.fillStyle = color;
      c.strokeStyle = color;
      if (shot.kind === 'blade') {
        c.translate(shot.x, shot.y);
        c.rotate(Math.atan2(shot.vy, shot.vx));
        c.lineWidth = 3;
        c.beginPath();
        c.arc(-12, 0, 25, -1.3, 1.3);
        c.stroke();
      } else {
        c.beginPath();
        c.arc(shot.x, shot.y, shot.radius * 0.65, 0, Math.PI * 2);
        c.fill();
        c.globalAlpha = 0.3;
        c.beginPath();
        c.arc(shot.x, shot.y, shot.radius * 1.4, 0, Math.PI * 2);
        c.fill();
      }
      c.restore();
    }
    for (const effect of arena.effects) {
      c.save();
      const progress = 1 - effect.life / effect.maxLife;
      c.globalAlpha = 1 - progress;
      c.strokeStyle = effect.color;
      c.fillStyle = effect.color;
      c.shadowColor = effect.color;
      c.shadowBlur = 10;
      c.lineWidth = 2;
      if (effect.kind === 'damage') {
        c.font = '500 23px "Cormorant Garamond", serif';
        c.textAlign = 'center';
        c.fillText(effect.text ?? '', effect.x, effect.y - progress * 32);
      } else if (effect.kind === 'slash') {
        c.beginPath();
        c.arc(effect.x, effect.y - 25, 45 + progress * 35, -1.6, 1.5);
        c.stroke();
      } else {
        c.beginPath();
        c.ellipse(effect.x, effect.y, 12 + progress * 85, 8 + progress * 38, 0, 0, Math.PI * 2);
        c.stroke();
      }
      c.restore();
    }
    for (let i = 0; i < 28; i++) {
      const x = (i * 197.7 + Math.sin(t / 2000 + i) * 10) % 1000;
      const y = (i * 87.1 - t / 150 + 60000) % 600;
      c.globalAlpha = 0.12 + (Math.sin(t / 1000 + i) + 1) * 0.25;
      c.fillStyle = i % 3 === 0 ? '#ffe0a6' : '#b2e7d1';
      c.beginPath();
      c.arc(x, y, i % 5 === 0 ? 1.9 : 1, 0, Math.PI * 2);
      c.fill();
    }
    c.globalAlpha = 1;
  }
  private shadow(x: number, y: number, radius: number, opacity: number) {
    const c = this.c;
    c.fillStyle = `rgba(2, 14, 15, ${opacity})`;
    c.beginPath();
    c.ellipse(x, y, radius, radius * 0.23, 0, 0, Math.PI * 2);
    c.fill();
  }
}
