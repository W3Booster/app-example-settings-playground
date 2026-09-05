import './shell.css';
import './controller.css';
import { classifyW3BoosterError } from '@w3booster/sdk';
import { w3boosterApp } from './w3booster.generated';
import { settings, syncedTitle } from './controller';
import { element } from './ui';

const query = new URLSearchParams(location.search);
document.body.dataset.application = w3boosterApp.clientId;
// One repository, one app.
const view = query.get('view') || 'application';
const theme = 'workbench';
const presentation = { brand: 'BROADCAST CONTROLLER', title: 'Broadcast title', description: 'Edit the title and control what appears on stream.' };
document.body.dataset.theme = theme;
document.title = presentation.brand + ' · W3Booster Examples';
// Direct visits start offline; registered W3Booster URLs explicitly select demo=0.
const demo = query.get('demo') !== '0';
const overlay = view === 'overlay';
document.body.classList.toggle('overlay', overlay);
document.documentElement.classList.toggle('overlay-root', overlay);
const root = document.querySelector<HTMLDivElement>('#app')!;
const shell = element('main', '', 'shell');
const header = element('header');
const brand = element('a', presentation.brand, 'brand'); brand.href = 'https://website.w3booster.com/developer/examples/'; header.append(brand);
const headerActions = element('div', '', 'header-actions');
const repository = element('a', 'Public repository ↗', 'repository-link'); repository.href = 'https://github.com/W3Booster/app-example-settings-playground'; repository.target = '_blank'; repository.rel = 'noopener noreferrer';
const badge = element('span', demo ? 'DEMO DATA' : 'LIVE CONNECTION', 'badge'); headerActions.append(badge, repository); header.append(headerActions);
const intro = element('div', '', 'intro');
const appTitle = element('h1', presentation.title);
intro.append(appTitle);
intro.append(element('p', presentation.description));
const status = element('p', 'Starting…', 'notice'); status.setAttribute('role', 'status');
const content = element('div', '', 'content');
const diagnostic = element('details', '', 'diagnostics');
diagnostic.append(element('summary', 'Connection & capabilities'));
const details = element('pre'); diagnostic.append(details);
const controls = element('div', '', 'controls');
if (demo) {
  const { scenarios } = await import('./scenarios');
  const label = element('label', 'Demo scenario '); const select = element('select'); select.setAttribute('aria-label', 'Demo scenario');
  for (const name of scenarios) { const option = element('option', name.replaceAll('-', ' ')); option.value = name; select.append(option); }
  select.value = query.get('scenario') || 'match';
  select.addEventListener('change', () => { const url = new URL(location.href); url.searchParams.set('scenario', select.value); location.assign(url); });
  label.append(select); controls.append(label);
}
const feedback = element('p', '', 'notice'); feedback.setAttribute('role', 'status');
const footer = element('footer');
for (const [text, href] of [['Setup guide', 'https://website.w3booster.com/developer/first-app/'], ['View source', 'https://github.com/W3Booster/app-example-settings-playground'], ['SDK reference', 'https://website.w3booster.com/developer/api/']]) {
  const link = element('a', text); link.href = href; footer.append(link);
}
shell.append(header, intro);
shell.append(controls, status, content, feedback, diagnostic, footer); root.replaceChildren(shell);
// Explicit synthetic on-air state, not a simulated save. Live defaults are off air.
const demoOptions = demo ? { settings: { display: { title: 'Community Cup · Round 1', onAir: query.get('scenario') !== 'off-air' } }, state: (await import('./scenarios')).scenarioState(query.get('scenario') || 'match'), interval: query.get('capture') === '1' || ['no-match', 'finished'].includes(query.get('scenario') || '') ? 0 : 1000 } : undefined;
// Preserve the authorized connection across UI hot updates; dispose only the old UI.
const cachedRuntime = import.meta.hot?.data.runtime as ReturnType<typeof w3boosterApp.createRuntime> | undefined;
const runtime = cachedRuntime || w3boosterApp.createRuntime({ retry: true, ...(demoOptions ? { demo: demoOptions } : {}) });
const uiLifetime = new AbortController();
const signal = uiLifetime.signal;
content.append(overlay ? syncedTitle(runtime, signal) : settings(runtime, demo, signal));
runtime.lifecycle.subscribe(snapshot => {
  status.textContent = snapshot.status === 'connected'
    ? (snapshot.isSynchronized ? (snapshot.state?.match.status === 'none' ? 'Connected · waiting for a match' : 'Connected · synchronized') : 'Connected · waiting for fresh data')
    : `${snapshot.status}${snapshot.retry ? ` · attempt ${snapshot.retry.attempt}` : ''}`;
  document.body.dataset.connection = snapshot.status;
  document.body.dataset.synchronized = String(snapshot.isSynchronized);

  details.textContent = JSON.stringify({ mode: demo ? 'demo' : 'live', status: snapshot.status, synchronized: snapshot.isSynchronized, match: snapshot.state?.match.status, dataCapabilities: snapshot.state?.capabilities || [], host: snapshot.host, definitionRevision: w3boosterApp.revision }, null, 2);
}, { signal });
runtime.client.on('issue', issue => { feedback.textContent = `A recoverable ${issue.source} issue occurred. See the browser console.`; console.warn(issue.source, issue.error); }, { signal });
try { await runtime.start(); }
catch (error) {
  const info = classifyW3BoosterError(error);
  feedback.textContent = info.kind === 'permission' ? 'Open Apps → Developer → My apps → Test locally in W3Booster. Opening localhost directly does not authorize live data.'
    : info.code === 'APPLICATION_DEFINITION_MISMATCH' ? 'Your app definition changed. Run npm run w3booster:sync, restart the app, and launch again.'
    : info.kind === 'abort' ? '' : `Could not start (${info.code}). Check your connection, then reload. Try ?demo=1 to work offline.`;
}
window.addEventListener('pagehide', () => { uiLifetime.abort(); void runtime.stop(); }, { once: true, signal });
if (import.meta.hot) {
  import.meta.hot.accept();
  import.meta.hot.dispose(data => { uiLifetime.abort(); data.runtime = runtime; });
}
