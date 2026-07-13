import { test } from 'node:test';
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');

const origin = process.env.SITE_ORIGIN ?? 'http://127.0.0.1:4173';
const pages = [
  'index.html',
  'approach.html',
  'embedded-controls-firmware.html',
  'power-electronics-prototyping.html',
  'test-automation-validation.html',
  'system-integration-recovery.html',
];
const ctaHref = 'mailto:info@herdersystemen.com?subject=Technical%20Discussion';

test('every rendered discussion CTA is a working mailto anchor', async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    for (const pageName of pages) {
      await page.goto(`${origin}/${pageName}`, { waitUntil: 'networkidle' });
      const ctas = page.getByRole('link', { name: /start a technical discussion/i });
      const count = await ctas.count();
      assert.ok(count > 0, `${pageName} should contain a discussion CTA`);

      for (let index = 0; index < count; index += 1) {
        const cta = ctas.nth(index);
        assert.equal(await cta.evaluate((element) => element.tagName), 'A');
        assert.equal(await cta.getAttribute('href'), ctaHref);
        await cta.click({ noWaitAfter: true });
      }
    }
  } finally {
    await browser.close();
  }
});
