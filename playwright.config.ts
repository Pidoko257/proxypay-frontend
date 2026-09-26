import { defineConfig, devices } from '@playwright/test';

const baseURL = 'http://127.0.0.1:3001/proxypay-frontend/';

export default defineConfig({
  testDir: './tests/quality',
  fullyParallel: true,
  reporter: [
    ['list'],
    ['html', { outputFolder: '.quality-reports/playwright', open: 'never' }],
    ['./scripts/accessibility-reporter.cjs'],
  ],
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: 'npm run serve -- --host 127.0.0.1 --port 3001 --no-open',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});