import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { preview } from 'vite';

const config = JSON.parse(await readFile(new URL('../example.json', import.meta.url), 'utf8'));
const definition = JSON.parse(await readFile(new URL('../app-definition.json', import.meta.url), 'utf8'));
const manifest = JSON.parse(await readFile(new URL('../dist/example-bindings.json', import.meta.url), 'utf8'));
const expected = {
  'match-dashboard': { surfaces: ['application'], scopes: ['match:read', 'players:read'] },
  'resource-monitor': { surfaces: ['streamOverlay', 'ingameOverlay'], scopes: ['match:read', 'players:read', 'resources:read'] },
  'settings-playground': { surfaces: ['application', 'streamOverlay'], scopes: ['match:read'] },
  'clean-overlay': { surfaces: ['streamOverlay', 'ingameOverlay'], scopes: ['match:read', 'players:read'] }
}[config.slug];
assert.deepEqual(config.surfaces, expected.surfaces);
assert.deepEqual(definition.surfaces, expected.surfaces);
assert.deepEqual(definition.scopes, expected.scopes);
assert.deepEqual(manifest.examples[0].surfaces, expected.surfaces);
const server = await preview({ preview: { host: '127.0.0.1', port: 0, strictPort: false } });
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const page = await context.newPage();
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const base = 'http://127.0.0.1:' + server.httpServer.address().port;
  const open = async query => { await page.goto(base + '/?' + query); await page.waitForSelector('body[data-synchronized="true"]'); };
  await open('capture=1');
  assert.equal(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), 'rgb(11, 13, 16)');
  assert.ok(await page.locator('h1').evaluate(el => parseFloat(getComputedStyle(el).fontSize) <= 24));
  assert.equal(await page.locator('body').getAttribute('data-application'), manifest.examples[0].clientId);
  assert.equal(await page.locator('.repository-link').getAttribute('href'), config.repository);
  assert.equal(await page.locator('.badge').textContent(), 'DEMO DATA');
  assert.equal(await page.getByRole('button', { name: 'Open compact window' }).count(), 0);
  if (config.slug === 'match-dashboard') {
    await page.getByRole('button', { name: 'Keep match snapshot' }).click();
    await page.getByRole('textbox', { name: 'Private match notes', exact: true }).fill('Opening: scout before expanding.\nPractice: spend gold before the next fight.');
    await page.reload(); await page.waitForSelector('body[data-synchronized="true"]');
    assert.match(await page.getByRole('textbox', { name: 'Private match notes', exact: true }).inputValue(), /scout before expanding/);
    await page.getByRole('button', { name: 'Keep match snapshot' }).click();
    assert.match(await page.getByRole('textbox', { name: 'Private match notes', exact: true }).inputValue(), /scout before expanding/);
    assert.equal(await page.locator('.notebook-entry').count(), 1, 'updating a snapshot preserves the note without duplicates');
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.getByRole('button', { name: 'Copy match summary + notes' }).click();
    assert.match(await page.evaluate(() => navigator.clipboard.readText()), /scout before expanding/);
  }
  if (config.slug === 'settings-playground') {
    const saved = await page.locator('.synced-title').textContent();
    await page.getByRole('textbox', { name: 'Broadcast title' }).fill('Next: the grand final');
    assert.equal(await page.locator('.title-preview h3').textContent(), 'Next: the grand final');
    assert.equal(await page.locator('.synced-title').textContent(), saved);
    assert.equal(await page.getByRole('button', { name: 'Save title' }).isDisabled(), true);
    assert.equal(await page.getByRole('button', { name: 'Take title off air' }).isDisabled(), true);
  }
  if (process.argv.includes('--screenshot')) {
    await page.evaluate(() => document.fonts.ready);
    await mkdir(new URL('../docs/', import.meta.url), { recursive: true });
    await page.screenshot({ path: new URL('../docs/screenshot.png', import.meta.url).pathname });
  }
  for (const scenario of ['no-match', 'missing-data', 'teams', 'finished']) {
    await open('scenario=' + scenario + '&capture=1');
    assert.ok((await page.locator('.content').textContent()).trim());
    if (scenario === 'no-match' && config.slug === 'match-dashboard') assert.equal(await page.getByRole('button', { name: 'Keep match snapshot' }).isDisabled(), true);
    if (scenario === 'missing-data' && config.slug === 'resource-monitor') {
      assert.match(await page.locator('.content').textContent(), /Resource data unavailable/);
      assert.equal(await page.locator('.resource-value.gold strong').first().textContent(), '—');
    }
    if (scenario === 'teams' && ['resource-monitor', 'clean-overlay'].includes(config.slug)) assert.equal(await page.locator(config.slug === 'resource-monitor' ? '.resource-card' : '.broadcast-player').count(), 4);
  }
  await page.setViewportSize({ width: 390, height: 844 }); await open('capture=1');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'mobile overflow');
  if (config.surfaces.includes('streamOverlay')) {
    await page.setViewportSize({ width: 1440, height: 960 });
    await open('view=overlay&demo=1&capture=1');
    assert.equal(await page.locator('header').isVisible(), false);
    assert.equal(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), 'rgba(0, 0, 0, 0)');
    const target = config.slug === 'resource-monitor' ? '.resource-card' : config.slug === 'clean-overlay' ? '.broadcast-strip' : '.synced-title-output';
    assert.equal(await page.locator(target).first().isVisible(), true);
    await page.evaluate(() => document.body.dataset.synchronized = 'false');
    assert.equal(await page.locator(target).first().isVisible(), false, 'stale overlay must not look live');
    await open('view=overlay&demo=1&capture=1&scenario=' + (config.slug === 'settings-playground' ? 'off-air' : 'no-match'));
    assert.equal(await page.locator(target).first().isVisible(), false, 'inactive output must be hidden');

    // CSS transparency alone is insufficient: verify the embedded canvas against
    // the host background under both compositor color schemes.
    for (const scheme of ['normal', 'dark']) {
      await page.setContent('<html style="color-scheme:' + scheme + '"><body style="margin:0;background:rgb(150,40,70)"><iframe style="width:800px;height:600px;border:0;color-scheme:' + config.overlayColorScheme + '" src="' + base + '/?view=overlay&demo=1&capture=1"></iframe></body></html>');
      await page.frameLocator('iframe').locator('body[data-synchronized="true"]').waitFor();
      const inside = await page.screenshot({ clip: { x: 780, y: 500, width: 1, height: 1 } });
      const outside = await page.screenshot({ clip: { x: 1000, y: 500, width: 1, height: 1 } });
      assert.deepEqual(inside, outside, 'opaque iframe canvas under ' + scheme + ' host');
    }
  }
  // Check the actual iframe canvas, not only CSS background declarations.
  for (const scheme of ['normal', 'dark']) {
    const probe = await context.newPage();
    await probe.setViewportSize({ width: 1440, height: 960 });
    await probe.setContent('<html style="color-scheme:' + scheme + '"><body style="margin:0;background:rgb(83,41,113)"><iframe style="border:0;width:960px;height:700px;color-scheme:normal" src="' + base + '/?view=overlay&demo=1&capture=1"></iframe></body></html>');
    await probe.frameLocator('iframe').locator('body[data-synchronized="true"]').waitFor();
    const inside = await probe.screenshot({ clip: { x: 780, y: 600, width: 1, height: 1 } });
    const outside = await probe.screenshot({ clip: { x: 1100, y: 600, width: 1, height: 1 } });
    assert.deepEqual(inside, outside, 'empty overlay canvas must stay transparent under ' + scheme);
    await probe.close();
  }
  await page.goto(base + '/?demo=0');
  await page.waitForFunction(() => document.body.innerText.includes('Opening localhost directly does not authorize') || document.body.innerText.includes('Could not start'), { timeout: 20000 });
  assert.equal(await page.locator('.badge').textContent(), 'LIVE CONNECTION');
  assert.notEqual(await page.locator('body').getAttribute('data-synchronized'), 'true');
  if (config.slug === 'match-dashboard') assert.equal(await page.locator('.notebook-entry').count(), 0, 'demo notes must not enter live notebook');
  assert.deepEqual(errors, []);
  console.log(config.slug + ': workflow, minimal scopes, surfaces, inactive/stale output, persistence, and authorization checks passed.');
} finally { await browser.close(); await new Promise(resolve => server.httpServer.close(resolve)); }
