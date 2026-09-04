import { canUseHostCapability } from '@w3booster/sdk';
import type { ApplicationRuntime } from '@w3booster/sdk/app';
import { element } from './ui';

export function settings(runtime: ApplicationRuntime<{ display: { title: string } }>, demo: boolean, signal: AbortSignal) {
  const view = element('section', '', 'settings-workbench');
  const form = element('form', '', 'settings-panel');
  form.append(element('span', '01 / CONFIGURE', 'eyebrow'), element('h2', 'Make it yours.'), element('p', 'One typed field. A real host action. Every surface kept in sync.'));
  const label = element('label', 'App title');
  const input = element('input'); input.name = 'title'; input.maxLength = 80;
  input.value = runtime.lifecycle.get().settings.display?.title || 'My first W3Booster app';
  label.append(input);
  const hint = element('p', 'display.title · string · up to 80 characters', 'field-hint');
  const save = element('button', 'Save title'); save.type = 'submit';
  const feedback = element('p', demo ? 'Local preview only. Saving requires an authenticated application window.' : 'Changes are saved through the W3Booster host.', 'notice');
  feedback.setAttribute('role', 'status');
  const previewPanel = element('div', '', 'settings-preview-panel');
  previewPanel.append(element('span', '02 / PREVIEW', 'eyebrow'));
  const preview = element('div', '', 'title-preview');
  const previewTitle = element('h3');
  preview.append(element('span', 'YOUR APPLICATION', 'eyebrow'), previewTitle, element('span', 'This preview changes as you type.', 'preview-caption'));
  const code = element('pre', '', 'settings-code');
  previewPanel.append(preview, element('span', 'SETTINGS PAYLOAD', 'eyebrow'), code);
  function renderPreview() { previewTitle.textContent = input.value || 'Untitled app'; code.textContent = JSON.stringify({ display: { title: input.value } }, null, 2); }
  let dirty = false;
  input.addEventListener('input', () => { dirty = true; renderPreview(); feedback.textContent = demo ? 'Local preview only — not saved.' : 'Unsaved changes.'; }, { signal });
  runtime.lifecycle.subscribe(snapshot => {
    save.disabled = !canUseHostCapability(snapshot.host, 'settings:write');
    if (!dirty && snapshot.settings.display?.title) { input.value = snapshot.settings.display.title; renderPreview(); }
  }, { signal });
  form.append(label, hint, save, feedback);
  form.addEventListener('submit', async event => {
    event.preventDefault(); save.disabled = true;
    try {
      await runtime.client.host.setSetting('display.title', input.value, { timeout: 5000, signal: runtime.signal });
      dirty = false; feedback.textContent = 'Saved. Other app surfaces receive the new setting too.';
    } catch { feedback.textContent = 'Could not save. Open this app inside W3Booster and check its connection.'; }
    finally { save.disabled = !canUseHostCapability(runtime.lifecycle.get().host, 'settings:write'); }
  }, { signal });
  renderPreview(); view.append(form, previewPanel);
  return view;
}
