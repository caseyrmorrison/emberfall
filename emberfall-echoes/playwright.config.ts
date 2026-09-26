import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  workers: 3,
  timeout: 40_000,
  use: {
    baseURL: 'http://127.0.0.1:4180/emberfall/echoes/',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        viewport: { width: 1440, height: 1000 },
      },
    },
    { name: 'mobile', use: { ...devices['Pixel 7'], channel: 'chrome' } },
  ],
  webServer: [
    {
      command: 'npm run build && npm run preview -- --port 4180 --base /emberfall/echoes/',
      url: 'http://127.0.0.1:4180/emberfall/echoes/',
      reuseExistingServer: false,
    },
  ],
});
