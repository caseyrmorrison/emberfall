import { test, expect } from '@playwright/test';
import { INITIAL_SETTINGS, newPlayer } from '../../src/game/model';
import { SAVE_KEY, serialize } from '../../src/game/save';

test('illustrated sanctuary, discovery, settings, and story', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('./');
  await expect(page.locator('html')).toHaveAttribute('data-art-ready', 'true');
  await expect(page.getByRole('heading', { name: 'The forest remembers.' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.locator('.scene-image')).toHaveCSS('opacity', '1');
  await page.screenshot({
    path: `test-results/${info.project.name}-sanctuary.png`,
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Watch the prologue' }).click();
  await expect(page.getByRole('dialog')).toHaveAttribute('aria-label', 'A promise in the ashes');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.locator('.dialogue')).toContainText('Mother left me');
  await page.getByRole('button', { name: 'Skip scene' }).click();
  await page.getByRole('button', { name: 'Enter the clearing' }).click();
  await expect(page.locator('#arena')).toBeVisible();
  await page.screenshot({ path: `test-results/${info.project.name}-explore.png`, fullPage: true });
  await page.locator('[data-landmark="memory"]').click();
  await expect(page.getByRole('dialog')).toHaveAttribute('aria-label', 'memory');
  await page.getByRole('button', { name: 'Carry it with you' }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('switch', { name: 'Reduced motion' }).click();
  await expect(page.getByRole('switch', { name: 'Reduced motion' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('switch', { name: 'Reduced motion' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  expect(errors).toEqual([]);
});
test('real-time combat, pause, and persistent rewards', async ({ page }, info) => {
  await page.goto('./');
  await expect(page.locator('html')).toHaveAttribute('data-art-ready', 'true');
  await page.getByRole('button', { name: 'Enter the clearing' }).click();
  await page.locator('[data-landmark="echo"]').click();
  await expect(page.locator('#enemy-hud')).toBeVisible();
  await page.screenshot({ path: `test-results/${info.project.name}-combat.png`, fullPage: true });
  await page.getByRole('button', { name: 'Ⅱ Pause', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'The world can wait.' })).toBeVisible();
  await page.getByRole('button', { name: 'Resume adventure' }).click();
  await page.locator('#arena').focus();
  await page.keyboard.down('j');
  await page.keyboard.down('q');
  await expect(page.getByRole('heading', { name: 'Echo released.' })).toBeVisible();
  await page.keyboard.up('j');
  await page.keyboard.up('q');
  await page.getByRole('button', { name: 'Continue your journey' }).click();
  await expect(page.locator('#currency')).toContainText('69');
  await page.reload();
  await expect(page.locator('#currency')).toContainText('69');
});
test('save import, permanent upgrades, and exported backup', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const p = { ...newPlayer(), gold: 400, level: 5 };
  await page.locator('#save-file').setInputFiles({
    name: 'echoes.json',
    mimeType: 'application/json',
    buffer: Buffer.from(serialize(p, INITIAL_SETTINGS)),
  });
  await expect(page.locator('#currency')).toContainText('400');
  await page.getByRole('button', { name: 'Forge', exact: true }).click();
  await page.locator('[data-upgrade="weapon"]').click();
  await expect(page.getByRole('heading', { name: 'Embersteel blade +1' })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export save' }).click();
  expect((await download).suggestedFilename()).toBe('emberfall-echoes-level-5.json');
  await page.locator('#save-file').setInputFiles({
    name: 'wrong-game.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ version: 1, player: p, settings: INITIAL_SETTINGS })),
  });
  await expect(page.locator('#toast')).toContainText('not an Echoes of the Moon save');
});
test('third warden completes the illustrated ending', async ({ page }, info) => {
  const p = {
    ...newPlayer(),
    level: 40,
    hp: 800,
    weapon: 20,
    armor: 20,
    region: 2 as const,
    wardens: 2,
  };
  await page.addInitScript(({ key, raw }) => localStorage.setItem(key, raw), {
    key: SAVE_KEY,
    raw: serialize(p, INITIAL_SETTINGS),
  });
  await page.goto('./');
  await expect(page.locator('html')).toHaveAttribute('data-art-ready', 'true');
  await page.getByRole('button', { name: 'Inspect the Moonlit Gate' }).click();
  await page.getByRole('button', { name: 'Step beyond the veil' }).click();
  await page.screenshot({ path: `test-results/${info.project.name}-warden.png`, fullPage: true });
  await page.locator('#arena').focus();
  await page.keyboard.down('j');
  await page.keyboard.down('q');
  await expect(page.getByRole('heading', { name: 'A light awakened.' })).toBeVisible({
    timeout: 15000,
  });
  await page.keyboard.up('j');
  await page.keyboard.up('q');
  await page.getByRole('button', { name: 'Continue your journey' }).click();
  await expect(page.getByRole('dialog')).toHaveAttribute('aria-label', 'An ember, shared');
  await expect
    .poll(() =>
      page.locator('.cinematic-art').evaluate((image: HTMLImageElement) => image.naturalWidth),
    )
    .toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Skip scene' }).click();
  await expect(page.locator('#scene-title')).toContainText('remembers you.');
});
test('production artwork loads under the nested Pages path', async ({ page }) => {
  const failures: string[] = [];
  page.on('response', (r) => {
    if (r.status() >= 400) failures.push(r.url());
  });
  page.on('pageerror', (e) => failures.push(e.message));
  await page.goto('http://127.0.0.1:4180/emberfall/echoes/', { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-art-ready', 'true');
  await page.getByRole('button', { name: 'Enter the clearing' }).click();
  await expect(page.locator('#arena')).toBeVisible();
  expect(failures).toEqual([]);
});

test('held pointer attack survives a second pointer release', async ({ page, isMobile }) => {
  await page.goto('./');
  await expect(page.locator('html')).toHaveAttribute('data-art-ready', 'true');
  const enter = page.getByRole('button', { name: 'Enter the clearing' });
  if (isMobile) await enter.tap();
  else await enter.click();
  const echo = page.locator('[data-landmark="echo"]');
  if (isMobile) await echo.tap();
  else await echo.click();
  await expect(page.locator('#enemy-hud')).toBeVisible();
  const strike = page.locator('[data-ability="strike"]');
  await expect(strike).toBeEnabled();
  // Distinct pointers reproduce a thumb on attack and a second thumb on movement.
  const bounds = (await strike.boundingBox())!;
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  const move = page.locator('[data-direction="d"]');
  await move.dispatchEvent('pointerdown', { pointerId: 22, pointerType: 'touch' });
  await move.dispatchEvent('pointerup', { pointerId: 22, pointerType: 'touch' });
  await expect(page.getByRole('heading', { name: 'Echo released.' })).toBeVisible({
    timeout: 12000,
  });
  await page.mouse.up();
});
