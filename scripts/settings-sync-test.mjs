import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { chromium } from 'playwright';

// A test transport delivers platform-shaped state to two real SDK runtimes.
// No test hooks or synthetic persistence are included in the published app.
const server = await createServer({ server: { host: '127.0.0.1', port: 0, strictPort: false }, plugins: [{
  name: 'settings-consumer-test',
  configureServer(server) {
    server.middlewares.use('/__sync-test', (_request, response) => {
      response.setHeader('Content-Type', 'text/html');
      response.end('<!doctype html><html><body></body></html>');
    });
  }
}] });
await server.listen();
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:' + server.httpServer.address().port + '/__sync-test');
  const result = await page.evaluate(async () => {
    const { settings, syncedTitle } = await import('/src/controller.ts');
    const { w3boosterApp } = await import('/src/w3booster.generated.ts');
    const { PROTOCOL_VERSION } = await import('/node_modules/@w3booster/sdk/src/index.js');
    const { createDemoState } = await import('/node_modules/@w3booster/sdk/src/testing.js');
    const contexts = [];
    const runtimes = [0, 1].map(() => w3boosterApp.createRuntime({ retry: false, transport: {
      name: 'test-settings-delivery',
      open(context) {
        contexts.push(context);
        context.onMessage({ version: PROTOCOL_VERSION, sequence: 1, type: 'state.snapshot', data: createDemoState({ clientId: w3boosterApp.clientId, settings: { display: { title: 'Saved broadcast', onAir: true } } }) });
      }, close() {}
    } }));
    const lifetime = new AbortController();
    document.body.append(settings(runtimes[0], false, lifetime.signal), syncedTitle(runtimes[1], lifetime.signal));
    await Promise.all(runtimes.map(runtime => runtime.start()));
    const titles = () => [...document.querySelectorAll('.synced-title')].map(node => node.textContent);
    const initial = titles();
    const input = document.querySelector('input'); input.value = 'Unsaved local draft'; input.dispatchEvent(new Event('input'));
    const whileTyping = titles();
    for (const context of contexts) context.onMessage({ version: PROTOCOL_VERSION, sequence: 2, type: 'state.patch', data: [{ op: 'replace', path: '/application/settings/display/title', value: 'Saved on another surface' }] });
    const afterDelivery = titles();
    const draft = input.value;
    for (const context of contexts) context.onMessage({ version: PROTOCOL_VERSION, sequence: 3, type: 'state.patch', data: [{ op: 'replace', path: '/application/settings/display/onAir', value: false }] });
    const offAir = [...document.querySelectorAll('.synced-title-output')].every(node => node.hidden);
    for (const context of contexts) context.onMessage({ version: PROTOCOL_VERSION, sequence: 4, type: 'state.patch', data: [{ op: 'replace', path: '/application/settings/display/onAir', value: true }] });
    const backOnAir = [...document.querySelectorAll('.synced-title-output')].every(node => !node.hidden);
    lifetime.abort();
    for (const context of contexts) context.onMessage({ version: PROTOCOL_VERSION, sequence: 5, type: 'state.patch', data: [{ op: 'replace', path: '/application/settings/display/title', value: 'After UI teardown' }] });
    const afterTeardown = titles();
    await Promise.all(runtimes.map(runtime => runtime.stop()));
    return { initial, whileTyping, afterDelivery, draft, afterTeardown, offAir, backOnAir };
  });
  assert.deepEqual(result.initial, ['Saved broadcast', 'Saved broadcast']);
  assert.deepEqual(result.whileTyping, result.initial);
  assert.deepEqual(result.afterDelivery, ['Saved on another surface', 'Saved on another surface']);
  assert.equal(result.draft, 'Unsaved local draft');
  assert.deepEqual(result.afterTeardown, result.afterDelivery);
  assert.equal(result.offAir, true);
  assert.equal(result.backOnAir, true);
  const actions = await page.evaluate(async () => {
    const { settings } = await import('/src/controller.ts');
    document.body.replaceChildren();
    let snapshot = { isSynchronized: true, state: null, settings: { display: { title: 'Already on air', onAir: true } }, host: { available: true, capabilities: ['settings:write'], capabilityStatus: 'known' } };
    const listeners = [], calls = []; let acknowledge;
    const runtime = { lifecycle: { get: () => snapshot, subscribe(fn) { listeners.push(fn); fn(snapshot); } }, client: { host: { setSetting(path, value) { calls.push({ path, value }); return new Promise(resolve => acknowledge = resolve); } } } };
    const lifetime = new AbortController();
    document.body.append(settings(runtime, false, lifetime.signal));
    const input = document.querySelector('input');
    const type = value => { input.value = value; input.dispatchEvent(new Event('input')); };
    const emit = patch => { snapshot = { ...snapshot, settings: { display: { ...snapshot.settings.display, ...patch } } }; listeners.forEach(fn => fn(snapshot)); };
    const title = () => document.querySelector('.synced-title').textContent;
    type('Next round'); document.querySelector('form').dispatchEvent(new Event('submit', { cancelable: true }));
    const beforeAck = title(); acknowledge({ display: { title: 'Next round', onAir: true } });
    await Promise.resolve(); await Promise.resolve();
    emit({}); // An ordinary SDK tick may arrive before the saved value.
    const draftAfterAck = input.value, afterAck = title();
    type('Grand final draft'); emit({ title: 'Next round' });
    const afterDelivery = title(), newerDraft = input.value;
    document.querySelector('.program-panel button').click();
    const visibleBeforeAck = !document.querySelector('.synced-title-output').hidden;
    acknowledge({ display: { title: 'Next round', onAir: false } });
    await Promise.resolve(); await Promise.resolve();
    const visibleAfterAck = !document.querySelector('.synced-title-output').hidden;
    emit({ onAir: false });
    const hiddenAfterDelivery = document.querySelector('.synced-title-output').hidden;
    lifetime.abort();
    return { calls, beforeAck, afterAck, draftAfterAck, afterDelivery, newerDraft, visibleBeforeAck, visibleAfterAck, hiddenAfterDelivery };
  });
  assert.deepEqual(actions.calls, [{ path: 'display.title', value: 'Next round' }, { path: 'display.onAir', value: false }]);
  assert.equal(actions.beforeAck, 'Already on air'); assert.equal(actions.afterAck, 'Already on air');
  assert.equal(actions.draftAfterAck, 'Next round'); assert.equal(actions.afterDelivery, 'Next round');
  assert.equal(actions.newerDraft, 'Grand final draft');
  assert.ok(actions.visibleBeforeAck && actions.visibleAfterAck && actions.hiddenAfterDelivery);
  console.log('Two real SDK runtimes update app/overlay consumers from delivered settings; drafts and teardown stay isolated.');
} finally { await browser.close(); await server.close(); }
