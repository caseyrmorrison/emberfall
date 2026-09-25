import { test, expect } from '@playwright/test';

test('production assets and cinematic artwork load under the Pages subpath', async ({ page }) => {
  const failures: string[] = [];
  page.on('response', (response) => {
    if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`);
  });
  page.on('pageerror', (error) => failures.push(error.message));
  await page.goto('http://127.0.0.1:4177/emberfall/', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: 'Whispering Woods' })).toBeVisible();
  await expect(page.locator('.story-card')).toHaveCSS(
    'background-image',
    /4177\/emberfall\/art\/emberfall-cinematic\.png/,
  );
  await page.locator('.story-card').click();
  await expect
    .poll(() =>
      page.locator('.cinematic-art').evaluate((image: HTMLImageElement) => image.naturalWidth),
    )
    .toBeGreaterThan(0);
  const ending = await page.request.get('http://127.0.0.1:4177/emberfall/art/emberfall-dawn.png');
  expect(ending.status()).toBe(200);
  expect(failures).toEqual([]);
});
