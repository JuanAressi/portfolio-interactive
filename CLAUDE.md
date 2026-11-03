# portfolio-interactive

Interactive 3D portfolio (Three.js + CSS3D monitor card). Public URL on GitHub Pages.

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:

- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore
- Author a backlog-ready spec/issue → invoke /spec

## Project context

Personal portfolio of Juan Aressi (Systems Engineer, full stack developer, co-founder of Cubrama).
The 3D desk scene (Three.js + CSS3D monitor) is the core of the project and must be preserved.
Goal of the current work: redesign for clients, show client projects, proper mobile layout,
and a cleaner, faster implementation. Client work is routed through Cubrama (cubrama.com).

## Working rules

- Work one ticket at a time, on its own branch. Do only what the ticket asks; list anything
  out of scope in the final report instead of fixing it.
- Code, identifiers and comments in English. UI copy in Spanish and English.
- Verify every ticket with: unit tests, build, e2e, and screenshots at 1440x900 and 390x844.
- At the end of each ticket, update the "Commands" and "Roadmap" sections of this file.
- Never kill processes by name pattern (pkill -f, killall). Only stop processes this session
  started, by PID. Other projects may be running on this machine.
- OG images and icons are committed PNGs. If name, role, scene framing or favicon change, run
  npm run og:generate and npm run icons:generate in the same ticket.

## Commands

Requires Node >= 22.23 (Astro 7). The site is served at `/`. `BASE_PATH` overrides the base for
`astro` and Playwright, and `SITE` overrides the site URL for `astro` (`SITE=https://example.com
npm run build`). Both are read from the environment, not from a `.env` file; the production
defaults are in `astro.config.mjs`.

Spanish lives at `/` and English at `/en/`. Both are `src/components/Portfolio.astro` with a
different `locale`; the text is in `src/i18n/es.ts` and `src/i18n/en.ts`, which must have the same
keys (`src/i18n/dictionaries.test.ts`). The monitor's job cards stay in `src/js/jobs-data.ts`.

- `npm run dev` — Astro dev server (`http://localhost:4321/`)
- `npm run build` — static build into `dist/`
- `npm run preview` — serve `dist/`
- `npm test` — Vitest unit tests
- `npm run test:e2e` — Playwright against `astro preview` (needs a fresh build)
- `npm run check` — `astro check` (types for `.astro` and `.ts` files)
- `npm run verify` — unit tests, build and e2e
- `npx wrangler dev` — serves `dist/` on the Workers runtime, with `public/_headers`, the 404 page
  and `html_handling` applied (`astro preview` applies none of them; needs a fresh build)
- `npx wrangler deploy --dry-run` — validates `wrangler.jsonc` and the assets without uploading.
  Production deploys come from `.github/workflows/deploy.yml` on push to `main`; pull requests run
  the same pipeline without the deploy step
- `npm run models:optimize` — rebuilds every model in `src/assets/models` from the originals in
  `assets-src/models` (out of the bundle); each model's steps are in `scripts/optimize-models.mjs`
- `npm run og:generate` — captures the internal `/og/<locale>/` pages into `public/og-<locale>.png`
  (1200×630) over its own dev server. Rerun it when the name, the role (`meta.role`) or the scene
  change; the PNGs are committed and neither the build nor CI generates them
- `npm run icons:generate` — builds `favicon.ico` and `apple-touch-icon.png` from
  `public/favicon.svg`; also committed

Absolute URLs (canonical, hreflang, `og:image`, JSON-LD, robots, sitemap) come from `site` and
`base` in `astro.config.mjs`. The head text is under `meta` in the dictionaries, and the links
shared by Contact and the JSON-LD are in `src/data/profile.ts`.

Response headers live in `public/_headers`. Every matching rule applies and repeated headers are
joined, so `/_astro/*` detaches the `Cache-Control` from `/*` before setting `immutable`. Only files
with a content hash may be `immutable`: that is everything under `/_astro/`, `.glb` and `.woff2`
included.

The e2e suite needs `npm run build` first and filters a single console message: the
`GPU stall due to ReadPixels` warning SwiftShader's compositor emits (`tests/console-problems.ts`).
For measurements on the real GPU, launch Chromium with `--use-angle=gl-egl`; Playwright's default
is software WebGL, where a frame takes seconds.

`src/assets/fonts/Manrope/Manrope-Variable-latin.woff2` is generated from the TTF in
`assets-src/fonts/Manrope` with `pyftsubset` (needs `fonttools` and `brotli`):
`--unicodes` set to Google Fonts' latin range, `--layout-features='*' --flavor=woff2`.

Under a coding agent (`AI_AGENT` set), `astro dev` and `astro preview` detach as background
servers; stop them with `astro dev stop` / `astro preview stop`, or pass `--ignore-lock` to
keep them in the foreground (Playwright's `webServer` relies on this).

## Design decisions (agreed)

- Identity: the colored "code lines" motif (bars, dots, squares). Gray at rest, color when
  active/hovered — same language as the Rubik cube logo. One row of lines per section as a
  signature, not repeated filler.
- Section titles have no numbering ("02 / projects" style is banned).
- Text entrance: the glitch runs over text already in the HTML (`[data-glitch]`), on the first load
  of the session and on arrival from a language link. Never with prefers-reduced-motion.
- The URL hash follows the active section (`replaceState`, no hash at Home), so a reload or a
  language link stays on the section.
- Fonts: Manrope for text; JetBrains Mono only for metadata (years, role, tech tags).
- Favicon and Home nav button: mini cube.
- Default language Spanish at `/`, English at `/en/`.
- Mobile: 3D scene in a fixed top window (~40% of the viewport), content below on a solid
  background; text never over the 3D scene. Bottom nav pill stays, showing the active
  section label; content reserves bottom space so the nav never covers it.
- Camera: still while a section is in view, moves only in a short scroll-tied transition band
  between sections (reversible). Never block or hijack native scroll.
- Scroll hint: in the hero, a gray line filling with color, hidden after first scroll.
  Desktop: right progress bar split into one segment per section.
- Projects: Voryn and SofiGior (sofigior.com). On desktop the monitor shows the live site.
  Employers stay as a separate Experience section, readable without hover.
- Contact: main CTA goes to Cubrama; GitHub, LinkedIn and CV below.

## Roadmap

Phase A — base (no visual changes)

- [x] T1 Migrate build to Astro 1:1
- [x] T2 Scene bugs and cleanup (duplicated desk, loader onError, dead code, source maps)
- [x] T3a Assets and render-on-demand (requestRender, lighter models, woff2 font)
- [x] T3b Deferred 3D and light mobile scene
- [x] T4a Language routes with server-rendered text
- [x] T4b SEO/OG, favicon, sitemap, 404
- [~] T5 Deploy to Cloudflare Workers (`portfolio.juan-aressi.workers.dev`): implemented, pending first real deploy
  - Still open: private repo and turning off GitHub Pages (manual), custom domain (see Readme).

Phase B — redesign

- [ ] T6 Identity tokens and mockups
- [ ] T7 Mobile layout
- [ ] T7b Section-based camera (holds + transition bands)
- [ ] T8 Hero
  - Nav entrance blocks clicks for ~1.46s (1.3s delay + pointer-events: none during animation). Fix as part of the hero entrance choreography.
  - Hero subtitle uses text-gray, which doesn't exist (no color applied). Define it as part of the hero redesign.
  - Home shows the monitor's idle screen (#141414) filling the right side: the initial camera pose is too close to the monitor. Define a new start pose for the hero.
- [ ] T9 Projects with the monitor
- [ ] T10 Accessible experience
- [ ] T11 About and Contact
- [ ] T12 Final QA and Lighthouse
  - npm audit: 15 dev-only vulnerabilities (eslint, @gltf-transform/cli).
