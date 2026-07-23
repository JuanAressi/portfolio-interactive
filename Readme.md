# Portfolio Interactive

An interactive 3D portfolio: a virtual desk scene built with Three.js, where scrolling moves the camera through Home → Work → About → Contact. Hovering a past employer lights up a monitor sitting on the desk with a live job-detail card, rendered via CSS3DRenderer so it reads as a real screen, not a flat overlay.

**Live:** https://JuanAressi.github.io/portfolio-interactive

## Features

- **3D desk scene** (Three.js) — room, desk, keyboard, mouse, chair, and a CSS3D-driven monitor, all lit with a mix of standard lights and RectAreaLight bezel accents.
- **Monitor job cards** — hovering a company in the Work list renders that job's role, dates, outcome, bullets, and tech-stack icons on the monitor screen, with a real Three.js light that ramps up alongside the card fade so the screen actually illuminates the desk around it.
- **EN/ES translations** — full UI and content parity, switchable from the nav.
- **Scroll-driven camera** — a custom "FakeScroll" rig ties native scroll position to camera movement and section navigation, with a native-scroll fallback on short/mobile viewports.
- **Contact section** — Email, GitHub, LinkedIn, and CV download, styled consistently with the Work section.

## Stack

Three.js · TypeScript · Tailwind CSS v4 · Parcel

## Development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

Deploy is automatic on push to `main` via GitHub Pages.

## Tests

```bash
npm test          # Vitest — unit tests (job data, tech icons, card rendering)
npm run test:e2e  # Playwright — layout/nav/i18n regression tests
```
