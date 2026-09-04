import { canUseHostCapability } from '@w3booster/sdk';
import type { ApplicationRuntime } from '@w3booster/sdk/app';
import { formatGameTime } from '@w3booster/sdk/standard-game';
import { element } from './ui';

type TitleRuntime = ApplicationRuntime<{ display: { title: string } }>;

// Both surfaces consume the SDK's resolved settings. Never render the draft here.
export function syncedTitle(runtime: TitleRuntime, signal: AbortSignal) {
  const output = element('section', '', 'synced-title-output');
  const title = element('strong', '', 'synced-title');
  const clock = element('span', '', 'synced-clock');
  output.append(title, clock);
  runtime.lifecycle.subscribe(snapshot => {
    title.textContent = snapshot.settings.display.title || 'Untitled broadcast';
    clock.textContent = snapshot.state?.match.status === 'none' || !snapshot.state
      ? 'Waiting for a match' : formatGameTime(snapshot.state.match.gameTime);
  }, { signal });
  return output;
}

export function settings(runtime: ApplicationRuntime<{ display: { title: string } }>, demo: boolean, signal: AbortSignal) {
  const view = element('section', '', 'settings-workbench');
  const form = element('form', '', 'settings-panel');
  form.append(element('span', '01 / EDIT A DRAFT', 'eyebrow'), element('h2', 'Name your broadcast.'), element('p', 'Saving asks the host to persist display.title. The output below reads it back from SDK settings.'));
  const label = element('label', 'App title');
  const input = element('input'); input.name = 'title'; input.maxLength = 80;
  input.value = runtime.lifecycle.get().settings.display?.title || 'My first W3Booster app';
  label.append(input);
  const hint = element('p', 'display.title · string · up to 80 characters', 'field-hint');
  const save = element('button', 'Save title'); save.type = 'submit';
  const feedback = element('p', demo ? 'Local preview only. Saving requires an authenticated application window.' : 'Changes are saved through the W3Booster host.', 'notice');
  feedback.setAttribute('role', 'status');
  const previewPanel = element('div', '', 'settings-preview-panel');
  previewPanel.append(element('span', '02 / UNSAVED PREVIEW', 'eyebrow'));
  const preview = element('div', '', 'title-preview');
  const previewTitle = element('h3');
  preview.append(element('span', 'LOCAL DRAFT ONLY', 'eyebrow'), previewTitle, element('span', 'Typing here does not change the saved output.', 'preview-caption'));
  const code = element('pre', '', 'settings-code');
  previewPanel.append(preview, element('span', 'SETTINGS PAYLOAD', 'eyebrow'), code);
  function renderPreview() { previewTitle.textContent = input.value || 'Untitled app'; code.textContent = JSON.stringify({ display: { title: input.value } }, null, 2); }
  let dirty = false;
  let saving = false;
  input.addEventListener('input', () => { dirty = true; renderPreview(); feedback.textContent = demo ? 'Local preview only — not saved.' : 'Unsaved changes.'; }, { signal });
  runtime.lifecycle.subscribe(snapshot => {
    save.disabled = saving || !canUseHostCapability(snapshot.host, 'settings:write');
    if (!dirty && snapshot.settings.display?.title) { input.value = snapshot.settings.display.title; renderPreview(); }
  }, { signal });
  form.append(label, hint, save, feedback);
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (saving || !canUseHostCapability(runtime.lifecycle.get().host, 'settings:write')) return;
    saving = true; save.disabled = true;
    const submitted = input.value;
    try {
      await runtime.client.host.setSetting('display.title', submitted, { timeout: 5000, signal: runtime.signal });
      dirty = input.value !== submitted;
      feedback.textContent = dirty ? 'Previous title saved. Your newer draft is not saved yet.' : 'Save acknowledged. The live output follows the value delivered by the SDK.';
    } catch { feedback.textContent = 'Could not save. Open this app inside W3Booster and check its connection.'; }
    finally { saving = false; save.disabled = !canUseHostCapability(runtime.lifecycle.get().host, 'settings:write'); }
  }, { signal });
  const consumer = element('div', '', 'synced-output-panel');
  consumer.append(element('span', '03 / SDK-SYNCED OUTPUT', 'eyebrow'), syncedTitle(runtime, signal));
  consumer.append(element('p', demo
    ? 'Demo defaults, not a simulated save. Launch from W3Booster to save and sync this title to the overlay.'
    : 'This output and the enabled stream/in-game overlay consume the same saved display.title. Changes from W3Booster’s app settings also arrive here.'));
  if (demo) {
    const link = element('a', 'Inspect the transparent demo surface ↗');
    link.href = '?view=overlay&demo=1'; link.target = '_blank'; link.rel = 'noopener noreferrer';
    consumer.append(link);
  }
  renderPreview(); view.append(form, previewPanel, consumer);
  return view;
}
