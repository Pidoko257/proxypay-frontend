import { defineConfig, devices } from '@playwright/test';

const baseURL = 'http://127.0.0.1:4173/';

export default defineConfig({
  testDir: './tests/quality',
  testMatch: /dashboard-accessibility\.spec\.ts/,
  fullyParallel: true,
  reporter: [
    ['list'],
    ['html', { outputFolder: '.quality-reports/playwright-dashboard', open: 'never' }],
    ['./scripts/accessibility-reporter.cjs'],
  ],
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev --prefix dashboard -- --host 127.0.0.1 --port 4173',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
