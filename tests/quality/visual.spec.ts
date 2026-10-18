import { percySnapshot } from '@percy/playwright';
import { test } from '@playwright/test';

const routes = [
  '/',
  '/api',
  '/changelog',
  '/chaos',
  '/dependencies',
  '/logs',
  '/logs-glossary',
  '/migration',
  '/performance',
  '/quality',
  '/rate-limits',
  '/sdk-guides',
  '/sharding',
];

for (const route of routes) {
  test(`visual snapshot ${route}`, async ({ page }) => {
    await page.goto(route.slice(1), { waitUntil: 'networkidle' });
    await percySnapshot(page, `ProxyPay docs ${route}`, { widths: [375, 1280] });
  });
}