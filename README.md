# Settings Playground

Learn generated settings and authenticated host actions. Change the app title, persist it through W3Booster, and observe updates across app windows.

[Try it now](https://w3booster.github.io/app-example-settings-playground/) · [Developer docs](https://website.w3booster.com/developer/) · [All examples](https://github.com/W3Booster/app-examples)

## Run locally

Node.js 22.22.3 or newer. No account, Warcraft III, desktop client, or database needed for demo mode.

```sh
git clone https://github.com/W3Booster/app-example-settings-playground.git
cd app-example-settings-playground
npm ci
npm run dev
```

Open **http://localhost:5173/**. Look for **DEMO DATA** and **Connected · synchronized**. Type into App title to change the preview; saving intentionally needs a live host.

## Make it yours

Edit **[src/render.ts](src/render.ts)** for the interface and **[src/style.css](src/style.css)** for its appearance. Change the heading in **[src/main.ts](src/main.ts)**. There is no app selector, shared-repository router, or second project to install.

The checked-in binding belongs to the official Settings Playground app. Cloning it does **not** give you ownership or authorize live data. Before launching your own fork, register a new app and replace this binding.

1. Enable Developer Mode in W3Booster, then open **Apps → Developer → Create app**.
2. Use [app-definition.json](app-definition.json) as a configuration guide. Choose your own name and URLs; copy the scopes and settings schema required by this interface.
3. Bind your new public client ID:

   ```sh
   npm run app:fork -- YOUR_NEW_CLIENT_ID
   ```

4. Commit the generated binding and package.json. Use **Test locally** with `http://localhost:5173/?demo=0`, then launch through W3Booster.

A direct visit defaults to demo mode. **Live URLs must include `demo=0`**. Live authorization failures never switch to demo data. A connected app waiting for a match is healthy. Host actions are disabled without authenticated host support; this is a browser app, not arbitrary filesystem or shell access.

## Project map

- `src/render.ts`: this app’s feature code.
- `src/main.ts`: SDK startup, diagnostics, host window action, and teardown/HMR.
- `src/scenarios.ts`: synthetic offline fixtures, lazy-loaded only in demo mode.
- `src/w3booster.generated.ts`: generated identity and typed settings; do not edit by hand.
- `scripts/browser-test.mjs`: real-browser scenario, responsive, and authorization-error checks.

## Check and publish

```sh
npm run check
npm run build
npx playwright install chromium
npm run test:browser
npm run screenshots
```

The screenshot command captures the real interface to `docs/screenshot.png`. ![Actual app screenshot](docs/screenshot.png)

Deploy `dist/` to an HTTPS static host. The included GitHub Actions workflow checks the app and deploys GitHub Pages; enable **Settings → Pages → GitHub Actions** in your repository. Set your own registered URLs to that origin with `?demo=0`. Builds use the checked-in registry lockfile and never fetch the platform definition automatically. After changing your registered contract, run `npm run w3booster:sync`; `npm run w3booster:check` is an explicit connected check.

The build emits `example-bindings.json` from the binding actually compiled into the app. Official catalog reapply checks each deployed app independently. No database or user credentials belong in this repository or Pages secrets.

For a complete Angular product, [start from Match Vision](https://github.com/W3Booster/app-match-vision/blob/main/docs/START_FROM_MATCH_VISION.md). For other focused apps, see the [example directory](https://github.com/W3Booster/app-examples).

MIT licensed; retain [LICENSE](LICENSE) when reusing source. No Warcraft artwork is bundled.
