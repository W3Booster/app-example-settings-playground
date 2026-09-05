import { readFile, mkdir, writeFile } from 'node:fs/promises';
import ts from 'typescript';

// Read the actual generated binding, never a separately copied official identity.
const source = ts.createSourceFile('binding.ts', await readFile(new URL('../src/w3booster.generated.ts', import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true);
const values = { clientId: [], revision: [] };
function visit(node) {
  if (ts.isPropertyAssignment(node) && ts.isIdentifier(node.name) && node.name.text in values && ts.isStringLiteral(node.initializer)) values[node.name.text].push(node.initializer.text);
  ts.forEachChild(node, visit);
}
visit(source);
if (values.clientId.length !== 1 || values.revision.length !== 1) throw new Error('Expected one generated application binding.');
const config = JSON.parse(await readFile(new URL('../example.json', import.meta.url), 'utf8'));
const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
if (pkg.w3booster && pkg.w3booster.clientId !== values.clientId[0]) throw new Error('package.json and generated binding disagree. Run w3booster-settings init for your app.');
await mkdir(new URL('../dist/', import.meta.url), { recursive: true });
await writeFile(new URL('../dist/example-bindings.json', import.meta.url), JSON.stringify({ examples: [{ slug: config.slug, clientId: values.clientId[0], revision: values.revision[0], surfaces: config.surfaces, overlayColorScheme: config.overlayColorScheme || 'normal' }] }, null, 2) + '\n');
