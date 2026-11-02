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

## Commands

Requires Node >= 22.23 (Astro 7). The site is served under `/portfolio-interactive/`.

- `npm run dev` — Astro dev server (`http://localhost:4321/portfolio-interactive/`)
- `npm run build` — static build into `dist/`
- `npm run preview` — serve `dist/`
- `npm test` — Vitest unit tests
- `npm run test:e2e` — Playwright against `astro preview` (needs a fresh build)
- `npm run check` — `astro check` (types for `.astro` and `.ts` files)
- `npm run verify` — unit tests, build and e2e

Under a coding agent (`AI_AGENT` set), `astro dev` and `astro preview` detach as background
servers; stop them with `astro dev stop` / `astro preview stop`, or pass `--ignore-lock` to
keep them in the foreground (Playwright's `webServer` relies on this).

## Design decisions (agreed)

- Identity: the colored "code lines" motif (bars, dots, squares). Gray at rest, color when
  active/hovered — same language as the Rubik cube logo. One row of lines per section as a
  signature, not repeated filler.
- Section titles have no numbering ("02 / projects" style is banned).
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
- [ ] T3 Performance (woff2 font, lighter models, deferred 3D, light mobile scene)
- [ ] T4 i18n routes, SEO/OG, favicon, 404
- [ ] T5 Deploy to Cloudflare, private repo, custom domain later

Phase B — redesign

- [ ] T6 Identity tokens and mockups
- [ ] T7 Mobile layout
- [ ] T7b Section-based camera (holds + transition bands)
- [ ] T8 Hero
- [ ] T9 Projects with the monitor
- [ ] T10 Accessible experience
- [ ] T11 About and Contact
- [ ] T12 Final QA and Lighthouse
