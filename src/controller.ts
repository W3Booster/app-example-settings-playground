import { canUseHostCapability } from '@w3booster/sdk';
import type { ApplicationRuntime } from '@w3booster/sdk/app';
import { formatGameTime } from '@w3booster/sdk/standard-game';
import { element } from './ui';

type Settings = { display: { title: string; onAir: boolean } };
type Runtime = ApplicationRuntime<Settings>;

// The program consumer has no dependency on the operator's unsaved draft.
export function syncedTitle(runtime: Runtime, signal: AbortSignal) {
  const output = element('section', '', 'synced-title-output');
  const title = element('strong', '', 'synced-title');
  const clock = element('span', '', 'synced-clock');
  output.append(element('span', 'LIVE BROADCAST', 'lower-third-kicker'), title, clock);
  runtime.lifecycle.subscribe(snapshot => {
    output.hidden = !snapshot.isSynchronized || !snapshot.settings.display.onAir;
    title.textContent = snapshot.settings.display.title || 'Untitled broadcast';
    const match = snapshot.state?.match;
    clock.textContent = !match || match.status === 'none' ? 'Between matches' : `${match.status === 'finished' ? 'Final · ' : ''}${formatGameTime(match.gameTime)}`;
  }, { signal });
  return output;
}

export function settings(runtime: Runtime, demo: boolean, signal: AbortSignal) {
  const view = element('section', '', 'controller');
  const form = element('form', '', 'operator-panel');
  form.append(element('span', 'OPERATOR / NOT SHOWN ON STREAM', 'eyebrow'), element('h2', 'Prepare the next title.'));
  const label = element('label', 'Broadcast title');
  const input = element('input'); input.name = 'title'; input.maxLength = 80;
  input.value = runtime.lifecycle.get().settings.display.title; label.append(input);
  const save = element('button', 'Save title'); save.type = 'submit';
  const feedback = element('p', demo ? 'Demo: preview a draft here. Saving and on-air controls require W3Booster.' : 'Save a title, then put the saved output on air.', 'notice'); feedback.setAttribute('role', 'status');
  const draft = element('div', '', 'title-preview');
  const draftTitle = element('h3', input.value); draft.append(element('span', 'DRAFT / NOT ON AIR', 'eyebrow'), draftTitle);
  let dirty = false, saving = false;
  let pendingTitle: string | null = null;
  input.addEventListener('input', () => { dirty = true; draftTitle.textContent = input.value || 'Untitled broadcast'; feedback.textContent = 'Unsaved draft. The stream still uses the delivered saved title.'; }, { signal });
  const program = element('div', '', 'program-panel');
  const stateLabel = element('strong', '', 'program-state');
  const stage = element('div', '', 'program-stage');
  const offAir = element('p', '', 'program-placeholder');
  stage.append(syncedTitle(runtime, signal), offAir);
  const take = element('button', 'Show saved title on stream'); take.type = 'button';
  async function action(path: 'display.title' | 'display.onAir', value: string | boolean) {
    if (saving || !canUseHostCapability(runtime.lifecycle.get().host, 'settings:write')) return;
    saving = true; save.disabled = true; take.disabled = true;
    const submitted = input.value;
    if (path === 'display.title') pendingTitle = submitted;
    try {
      if (path === 'display.title') await runtime.client.host.setSetting(path, String(value), { timeout: 5000, signal });
      else await runtime.client.host.setSetting(path, value === true, { timeout: 5000, signal });
      feedback.textContent = 'Host acknowledged the change. Program output follows SDK delivery, not this acknowledgement.';
    } catch { if (path === 'display.title') pendingTitle = null; feedback.textContent = 'Change was not confirmed. Check the connection and saved output before retrying.'; }
    finally { saving = false; updateControls(); }
  }
  function updateControls() {
    const snapshot = runtime.lifecycle.get();
    const allowed = snapshot.isSynchronized && canUseHostCapability(snapshot.host, 'settings:write');
    save.disabled = saving || !allowed;
    take.disabled = saving || !allowed;
  }
  form.addEventListener('submit', event => { event.preventDefault(); void action('display.title', input.value); }, { signal });
  take.addEventListener('click', () => { void action('display.onAir', !runtime.lifecycle.get().settings.display.onAir); }, { signal });
  runtime.lifecycle.subscribe(snapshot => {
    const onAir = snapshot.settings.display.onAir;
    stateLabel.textContent = !snapshot.isSynchronized ? 'NOT FRESH / OUTPUT HIDDEN' : onAir ? 'ON AIR · SAVED OUTPUT' : 'OFF AIR';
    stateLabel.dataset.onAir = String(onAir && snapshot.isSynchronized);
    offAir.hidden = onAir && snapshot.isSynchronized;
    offAir.textContent = snapshot.isSynchronized ? 'The stream output is transparent while off air.' : 'Waiting for fresh settings. Stale output is hidden.';
    take.textContent = onAir ? 'Take title off air' : 'Show saved title on stream';
    if (pendingTitle !== null && snapshot.settings.display.title === pendingTitle) {
      dirty = input.value !== pendingTitle;
      pendingTitle = null;
    }
    if (!dirty && pendingTitle === null) { input.value = snapshot.settings.display.title; draftTitle.textContent = input.value; }
    updateControls();
  }, { signal });
  form.append(label, save, feedback, draft);
  program.append(stateLabel, stage, take, element('p', 'Enable this app’s Stream overlay in W3Booster. For OBS, copy your W3Booster URL from Set up OBS. The controller is private; only the lower third reaches viewers. There is deliberately no in-game overlay.'));
  view.append(form, program); return view;
}
