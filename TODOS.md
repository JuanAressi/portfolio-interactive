# TODOS

## Portfolio

### HTMLTexture / html-in-canvas progressive enhancement

**What:** After Three bump + feature-detect `texElementImage2D`, optionally swap CSS3D for `HTMLTexture` when supported.

**Why:** Same job card with true WebGL lighting/occlusion later, without flag-gating the public GitHub Pages URL.

**Context:** Approved design defers native html-in-canvas. Site: https://html-in-canvas.dev/. Installed `three@0.178` has no `HTMLTexture`. Reuse `work-card` DOM; detect API; fall back to CSS3D. Do not start until the CSS3D ship slice is stable with real Card #1 copy.

**Effort:** L
**Priority:** P3
**Depends on:** HUD + CSS3D + `#work` card shipped; Card #1 content live

### Work dock → monitor-fill camera pose

**What:** Optional dedicated camera tween so Work nav fills the monitor (today Work scroll pulls the camera back).

**Why:** Users expect “Work” to look at work on the screen; the CatmullRom curve currently does the opposite of that metaphor.

**Context:** `src/js/camera-movement.js` — progress 0 is closest to the monitor; scrolling to `#work` increases progress. Approved design deferred this. Implement only after desk-glance CSS3D + `#work` card are stable. Must not break FakeScroll / `smoothScrollY` coupling.

**Effort:** M
**Priority:** P2
**Depends on:** Card on monitor + `#work` card live

### Playwright smoke for cardNear + CTA

**What:** One E2E covering desktop land → CTA clickable; scroll past exit threshold → not clickable; resize to native → `#work` card present.

**Why:** Vitest on `work-card` cannot catch stacking/hit-test failures — the real CSS3D ship risk called out in outside voice.

**Context:** Eng review locked Vitest + manual QA for this pass. Add Playwright after CSS3D works once by hand. Prefer headed smoke against `parcel`/`dist` on Chromium. Expect some WebGL flake; keep assertions on DOM PE/CTA, not pixel screenshots of the room.

**Effort:** M
**Priority:** P2
**Depends on:** CSS3D + hit-test stack shipped

### Manrope on CSS3D monitor card

**What:** After densify ships and desk QA passes, remove `.monitor-job-card { font-family: system-ui }` and use page Manrope; verify CSS3D glyph paint.

**Why:** Design wants Manrope; eng review locked system-ui as a temporary CSS3D exception.

**Context:** `src/styles.css` ~471 forces system-ui on the card while `*` uses Manrope. Outside voice flagged blind Manrope switch. Start by A/B at desk distance after dense cards are live.

**Effort:** S
**Priority:** P3
**Depends on:** Denser monitor card Phase 1 shipped + desk QA

### Mute non-dense Work list hover affordance

**What:** Visually/semantically distinguish Persiscal / Patatag / SACSI (opacity, cursor, or drop `data-job-id`) so idle-gated hover doesn’t feel broken.

**Why:** Dense-gate blanks the monitor for 3/6 employers; list still looks equally interactive.

**Context:** Eng plan locks `isDenseJobPreview` → clearMonitorJob. `index.html` still sets `data-job-id` on pending items. Pick mute styling vs remove hover target after densify is live.

**Effort:** S
**Priority:** P3
**Depends on:** Dense-gate behavior shipped

## Completed
