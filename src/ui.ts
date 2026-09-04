// Use textContent for all match/user values; never interpolate them as HTML.
export function element<K extends keyof HTMLElementTagNameMap>(tag: K, text = '', className = '') {
  const node = document.createElement(tag);
  node.textContent = text;
  node.className = className;
  return node;
}
export function metric(label: string, value: string) {
  const node = element('div', '', 'metric');
  node.append(element('span', label), element('strong', value));
  return node;
}
