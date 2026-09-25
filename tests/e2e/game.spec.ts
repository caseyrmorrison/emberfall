import { test, expect } from '@playwright/test';
import { newPlayer, DEFAULT_SETTINGS } from '../../src/game/model';

test('click pathfinding and directional controls move through the visible map', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  const point = await page.locator('#world').evaluate((canvas: HTMLCanvasElement) => {
    const bounds = canvas.getBoundingClientRect();
    const scale = Math.max(bounds.width / canvas.width, bounds.height / canvas.height);
    const fraction = parseFloat(canvas.style.objectPosition) / 100;
    return {
      x: (14 * 16 + 8) * scale - (canvas.width * scale - bounds.width) * fraction,
      y: (17 * 16 + 8) * scale,
    };
  });
  await page.locator('#world').click({ position: point });
  await expect(page.locator('#coordinates')).toContainText('14 : 17');
  if (testInfo.project.name === 'mobile') {
    const down = page.getByRole('button', { name: 'Move down', exact: true });
    const box = (await down.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await expect(page.locator('#coordinates')).not.toContainText('14 : 17');
    await page.mouse.up();
  }
});
test('exploration, menus, save recovery, and cinematics', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Whispering Woods' })).toBeVisible();
  await page.screenshot({
    path: `test-results/${testInfo.project.name}-adventure.png`,
    fullPage: true,
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('switch', { name: 'Reduced motion' }).click();
  await expect(page.getByRole('switch', { name: 'Reduced motion' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await page.getByRole('switch', { name: 'Music', exact: true }).click();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('switch', { name: 'Music', exact: true })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: 'Return to camp' }).click();
  await page.getByRole('button', { name: 'Rest by the fire' }).click();
  await page.getByRole('button', { name: 'Character', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Lyra Ashveil', exact: true }).last(),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'World', exact: true }).click();
  await expect(page.locator('[data-travel="1"]')).toBeDisabled();
  await page.keyboard.press('Escape');
  await page.locator('.story-card').click();
  await expect(page.getByRole('dialog')).toHaveAttribute('aria-label', 'A promise in the ashes');
  await expect(page.locator('.cinematic-art')).toBeVisible();
  await page.screenshot({
    path: `test-results/${testInfo.project.name}-cinematic.png`,
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.locator('.dialogue')).toContainText('My brother called it a curse');
  await page.getByRole('button', { name: 'Skip scene' }).click();
  expect(errors).toEqual([]);
});
test('keyboard exploration initiates combat, rewards victory, and saves it', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  // Seven steps east lead from camp to the first visible Mossling.
  await page.locator('#world').focus();
  await page.keyboard.down('d');
  await expect(page.locator('.enemy-hud')).toBeVisible();
  await page.keyboard.up('d');
  await expect(page.locator('.enemy-hud')).toContainText('Mossling');
  await expect(page.locator('.battle-vitals')).toContainText('100 / 100');
  await page.screenshot({
    path: `test-results/${testInfo.project.name}-battle.png`,
    fullPage: true,
  });
  const victory = page.getByRole('heading', { name: 'Victory', exact: true });
  // A critical Ember Arc can win in one hit; normal rolls take two.
  for (let turn = 0; turn < 3; turn++) {
    if (await victory.isVisible()) break;
    await page.locator('[data-combat="ember"]').click();
    await expect(page.locator('[data-combat="ember"]:enabled').or(victory)).toBeVisible();
  }
  await expect(page.getByRole('heading', { name: 'Victory', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Onward', exact: true }).click();
  await expect(page.locator('#gold')).toContainText('48');
  await page.reload();
  await expect(page.locator('#gold')).toContainText('48');
});
test('save import, upgrades, invalid import recovery, and export', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const p = { ...newPlayer(), gold: 500, level: 4, hp: 60, seen: ['awakening'] };
  await page.locator('#import-file').setInputFiles({
    name: 'journey.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ version: 1, player: p, settings: DEFAULT_SETTINGS })),
  });
  await expect(page.locator('#gold')).toContainText('500');
  await page.getByRole('button', { name: 'Return to camp' }).click();
  await page.getByRole('button', { name: 'Visit the forge' }).click();
  await page.locator('[data-upgrade="weapon"]').click();
  await expect(page.getByRole('heading', { name: 'Embersteel blade +1' })).toBeVisible();
  await expect(page.locator('#gold')).toContainText('455');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export save' }).click();
  expect((await download).suggestedFilename()).toBe('emberfall-level-4.json');
  await page
    .locator('#import-file')
    .setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('null') });
  await expect(page.getByRole('status').last()).toContainText('not a compatible Emberfall save');
  await page.keyboard.press('Escape');
  await expect(page.locator('#gold')).toContainText('455');
});
test('warden progression unlocks travel and final story completes', async ({ page }) => {
  await page.addInitScript(
    ({ player, settings }) =>
      localStorage.setItem('emberfall.save.v1', JSON.stringify({ version: 1, player, settings })),
    {
      player: {
        ...newPlayer(),
        level: 30,
        hp: 535,
        mp: 70,
        weapon: 10,
        armor: 10,
        region: 2,
        bosses: ['guardian', 'sentinel'],
        x: 41,
        y: 10,
        seen: ['awakening', 'tide', 'summit'],
      },
      settings: { ...DEFAULT_SETTINGS, reducedMotion: true },
    },
  );
  await page.goto('/');
  await page.locator('#world').focus();
  await page.keyboard.press('e');
  await page.getByRole('button', { name: 'Face the warden' }).click();
  await expect(page.locator('[data-combat="flee"]')).toBeDisabled();
  for (let i = 0; i < 10; i++) {
    if (await page.getByRole('heading', { name: 'Victory', exact: true }).isVisible()) break;
    await expect(page.locator('[data-combat="ember"]')).toBeEnabled();
    await page.locator('[data-combat="ember"]').click();
  }
  await expect(page.getByRole('heading', { name: 'Victory', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Onward', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveAttribute(
    'aria-label',
    'All the lights we leave behind',
  );
  const img = page.locator('.cinematic-art');
  await expect(img).toBeVisible();
  await expect
    .poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth))
    .toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Skip scene' }).click();
  await expect(page.getByRole('heading', { name: 'The light returns' })).toBeVisible();
});
