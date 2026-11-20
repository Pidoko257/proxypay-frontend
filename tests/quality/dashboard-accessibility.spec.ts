import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('axe accessibility audit on dashboard root', async ({ page }, testInfo) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('main, #root', { state: 'attached' });

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
    .analyze();
  const critical = results.violations.filter(({ impact }) => impact === 'critical');

  await testInfo.attach('axe-report', {
    body: Buffer.from(
      JSON.stringify({
        route: '/dashboard',
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
    'Critical axe violations on dashboard',
  ).toEqual([]);
});

test('dashboard primary controls are keyboard reachable', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.keyboard.press('Tab');

  const focusedTag = await page.evaluate(() => document.activeElement?.tagName);
  expect(focusedTag).not.toBe('BODY');
});
