# Portfolio Interactive

An interactive 3D portfolio: a virtual desk scene built with Three.js, where scrolling moves the camera through Home → Work → About → Contact. Hovering a past employer lights up a monitor sitting on the desk with a live job-detail card, rendered via CSS3DRenderer so it reads as a real screen, not a flat overlay.

**Live:** https://portfolio.juan-aressi.workers.dev

## Features

- **3D desk scene** (Three.js) — room, desk, keyboard, mouse, chair, and a CSS3D-driven monitor, all lit with a mix of standard lights and RectAreaLight bezel accents.
- **Monitor job cards** — hovering a company in the Work list renders that job's role, dates, outcome, bullets, and tech-stack icons on the monitor screen, with a real Three.js light that ramps up alongside the card fade so the screen actually illuminates the desk around it.
- **EN/ES translations** — full UI and content parity, switchable from the nav.
- **Scroll-driven camera** — a custom "FakeScroll" rig ties native scroll position to camera movement and section navigation, with a native-scroll fallback on short/mobile viewports.
- **Contact section** — Email, GitHub, LinkedIn, and CV download, styled consistently with the Work section.

## Stack

Three.js · TypeScript · Tailwind CSS v4 · Astro

## Development

Requires Node >= 22.23.

```bash
npm install
npm run dev
```

The site is served at `/`: Spanish at `/`, English at `/en/`.

## Production build

```bash
npm run build
```

To try the build on the Workers runtime, with `public/_headers`, the 404 page and the trailing-slash handling applied:

```bash
npx wrangler dev
```

## Deploy

The site runs on Cloudflare Workers as static assets (`wrangler.jsonc`), with no Worker code.

`.github/workflows/deploy.yml` runs unit tests, type check, build and e2e on every pull request. On push to `main` it also deploys with `cloudflare/wrangler-action`, which needs the `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository secrets.

### Moving to a custom domain

The site URL only appears in the `site` default in `astro.config.mjs`; canonical, hreflang, `og:url`, `og:image`, JSON-LD, sitemap and `robots.txt` are all built from it.

1. Change the default in `astro.config.mjs` to the new URL. A build can also take it from the environment, without touching the file: `SITE=https://example.com npm run build`.
2. Attach the domain to the worker in `wrangler.jsonc`:

    ```jsonc
    "routes": [{ "pattern": "example.com", "custom_domain": true }],
    ```

3. Update the **Live** link above and `homepage` in `package.json`, then push to `main`.

## Tests

```bash
npm test          # Vitest — unit tests (job data, tech icons, card rendering)
npm run test:e2e  # Playwright — layout/nav/i18n regression tests
```
