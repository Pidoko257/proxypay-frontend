import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.route('**/api/transactions**', async route => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        data: [{
          id: 'tx-1',
          reference: 'ref-1',
          stellarHash: 'hash-1',
          mobileMoneyReference: 'mobile-1',
          amount: 10,
          fee: 1,
          feeBreakdown: { platformFee: 0.4, networkFee: 0.3, providerFee: 0.3 },
          status: 'settled',
          provider: 'mtn',
          timestamp: '2026-01-01T00:00:00.000Z',
          auditTrail: [],
        }],
        total: 1,
      }),
    })
  })
  await page.route('**/api/notifications/settings', async route => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        settings: [{ eventType: 'transaction.settled', emailEnabled: true, webhookEnabled: false }],
      }),
    })
  })
})

test('transaction viewing, export, and drawer keyboard close are available', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Transaction History')).toBeVisible()
  await page.getByRole('button', { name: /View transaction ref-1/i }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveAttribute('aria-modal', 'false')
  await page.getByRole('button', { name: 'Export CSV' }).click()
  await expect(page.getByRole('group', { name: 'Export options' })).toBeVisible()
})

test('notification settings can be opened and toggled', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Notification Settings' }).click()
  await expect(page.getByText('Notification Settings')).toBeVisible()
  await expect(page.getByRole('checkbox', { name: 'Email Notifications' })).toBeChecked()
  await page.getByRole('checkbox', { name: 'Email Notifications' }).uncheck()
})