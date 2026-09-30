import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

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
  test(`axe accessibility audit ${route}`, async ({ page }, testInfo) => {
    await page.goto(route.slice(1), { waitUntil: 'networkidle' });
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
      .analyze();
    const critical = results.violations.filter(({ impact }) => impact === 'critical');

    await testInfo.attach('axe-report', {
      body: Buffer.from(
        JSON.stringify({
          route,
          violationCount: results.violations.length,
          violations: results.violations,
          passes: results.passes.length,
          incomplete: results.incomplete.length,
        }),
      ),
      contentType: 'application/json',
    });

    expect(
      critical.map(({ id, help }) => `${id}: ${help}`),
      `Critical axe violations on ${route}`,
    ).toEqual([]);
  });
}

test('primary navigation can be reached with the keyboard', async ({ page }) => {
  await page.goto('', { waitUntil: 'networkidle' });
  await page.keyboard.press('Tab');

  const focusedTag = await page.evaluate(() => document.activeElement?.tagName);
  expect(focusedTag).not.toBe('BODY');
});