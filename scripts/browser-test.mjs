import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { preview } from 'vite';

const config = JSON.parse(await readFile(new URL('../example.json', import.meta.url), 'utf8'));
const manifest = JSON.parse(await readFile(new URL('../dist/example-bindings.json', import.meta.url), 'utf8'));
const server = await preview({ preview: { host: '127.0.0.1', port: 0, strictPort: false } });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const base = 'http://127.0.0.1:' + server.httpServer.address().port;
  await page.goto(base + '/?capture=1');
  await page.waitForSelector('body[data-synchronized="true"]');
  assert.equal(await page.locator('body').getAttribute('data-application'), manifest.examples[0].clientId);
  assert.equal(await page.locator('body').getAttribute('data-theme'), config.theme);
  assert.equal(await page.locator('.repository-link').getAttribute('href'), config.repository);
  assert.equal(await page.locator('.badge').textContent(), 'DEMO DATA');
  assert.equal(await page.getByRole('button', { name: 'Open compact window' }).count(), 0);
  if (process.argv.includes('--screenshot')) {
    await page.evaluate(() => document.fonts.ready);
    await mkdir(new URL('../docs/', import.meta.url), { recursive: true });
    await page.screenshot({ path: new URL('../docs/screenshot.png', import.meta.url).pathname });
  }
  if (config.slug === 'settings-playground') {
    const saved = await page.locator('.synced-title').textContent();
    await page.getByRole('textbox', { name: 'App title' }).fill('My tournament');
    assert.equal(await page.locator('.title-preview h3').textContent(), 'My tournament');
    assert.equal(await page.locator('.synced-title').textContent(), saved, 'unsaved edits must not change SDK-synced output');
    assert.equal(await page.getByRole('button', { name: 'Save title' }).isDisabled(), true);
  }
  for (const scenario of ['no-match', 'missing-data', 'teams', 'finished']) {
    await page.goto(base + '/?scenario=' + scenario + '&capture=1');
    await page.waitForSelector('body[data-synchronized="true"]');
    assert.ok((await page.locator('.content').textContent()).trim());
    if (scenario === 'no-match') assert.match(await page.locator('.shell > [role=status]').first().textContent(), /waiting for a match/);
    if (scenario === 'missing-data' && config.slug === 'resource-monitor') assert.match(await page.locator('.content').textContent(), /unavailable/i);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + '/?capture=1');
  await page.waitForSelector('body[data-synchronized="true"]');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'mobile horizontal overflow');
  if (config.overlay) {
    await page.goto(base + '/?view=overlay&demo=1&capture=1');
    await page.waitForSelector('.synced-title-output');
    assert.equal(await page.locator('header').isVisible(), false);
    assert.equal(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), 'rgba(0, 0, 0, 0)');
  }
  await page.goto(base + '/?demo=0');
  await page.waitForFunction(() => document.body.innerText.includes('Opening localhost directly does not authorize') || document.body.innerText.includes('Could not start'), { timeout: 20000 });
  assert.equal(await page.locator('.badge').textContent(), 'LIVE CONNECTION');
  assert.notEqual(await page.locator('body').getAttribute('data-synchronized'), 'true');
  assert.deepEqual(errors, []);
  console.log(config.slug + ': demo, scenarios, source link, mobile, host gating, and unauthorized live launch passed.');
} finally { await browser.close(); await new Promise(resolve => server.httpServer.close(resolve)); }
