# T14 scene geometry

Before: `baseline.{json,md}` (T13, commit `847e1bc`). After: `geometry.{json,md}`. Side by side, per
section, viewport and GPU mode: `geometry-comparison.md`. Both from `npm run scene:profile`.

## What changed

- **room.ts**: the five wall boxes are one mesh (`room-walls`), the floor is one (`room-floor`).
- **desk.js**: the 13 boxes of the two drawers and the top are one mesh (`desk-body`); the four door
  handles (four GLB meshes each) are merged into one (`desk-handles`) once the model loads, with
  their transforms baked into the desk's space. The drawers stay as empty groups at the same
  positions, so `userData.leftCajonera/rightCajonera` still work.
- **monitor.js**: bezel (four boxes) → `monitor-bezel`, `monitor-stand`, foot and neck →
  `monitor-base`, plus `monitor-screen`. The panel behind the screen is gone: nothing sees it and
  the monitor casts no shadow. The 16 faces of the monitor that no camera pose sees are not
  built either (the monitor neither casts nor receives shadows, so nothing but the camera looks
  at them).
- **Materials**: `scene-materials.ts` holds one instance per look (`paint`, `wall`, `floor`,
  `matte`, `stand`, `base`). The scene went from 46 material instances to 23 (the rest are the
  GLB models').
- **Geometry**: every procedural geometry only has `position` and `normal` (no material has a
  texture, so the uvs went), built from one-segment boxes.
- **Bake preparation**: every mesh has a stable `name` and `userData.static` / `userData.bakeGroup`.

| Mesh | `bakeGroup` | `static` |
| --- | --- | --- |
| `room-walls`, `room-floor` | `room` | `true` |
| `desk-body`, `desk-handles` | `desk` | `true` |
| `monitor-bezel`, `monitor-stand`, `monitor-base`, `monitor-screen` | `monitor` | `false` |
| `keyboard-NN`, `mouse-NN`, `books-NN`, `chair-NN` (numbered in the model's traversal order) | `props` | `true` |

Lights are named too (`room-window-light`, `monitor-glow-light`, `monitor-line-light-*`). The
monitor, its screen and its glow light stay dynamic, as asked.

## Result (real GPU, Intel Iris Xe)

| | Before | After |
| --- | --- | --- |
| Draw calls, desktop (shadow passes included) | 201–259 | 97–124 |
| Draw calls, mobile | 9–42 | 7–25 |
| Render p95 (ms), desktop | 9.9–16.7 | 2.2–2.5 |
| Frame p95 (ms), desktop | 16.8–33.3 | 16.7–16.8 |
| Frame p95 (ms), mobile (CPU 4x slower) | 33.4–39.2 | 16.7–16.8 |
| Meshes / shadow casters | 72 / 63 | 34 / 30 |

Against the budget of `baseline.md`: desktop is under the interim goal of 150 draw calls but not
under the 100,000 triangles (104,500–127,600, nearly all of it the shadow passes); mobile is under
30 calls and under 30,000 triangles. The end goal (30 calls) needs T15 and the GLB meshes.

**Triangles went up in some cells** (mobile Home 88 → 8,856; desktop Home +9%). It is the price of
merging: three.js culls a mesh by its bounding sphere, and the single handles mesh spans both
drawers, so its 8,576 triangles are drawn whenever any part of that sphere is in view, where before
each of the 16 pieces was culled on its own. The calls saved are worth much more than the triangles
added (render p95 down 77–92%), and no cell goes over its triangle budget on mobile. Splitting the
handles per drawer would trade one call for part of that back, if it ever matters.

## What was *not* removed, and why

The ticket asks to drop the faces and meshes the inventory marks as never seen. Doing it for the
walls and the desk moves the shadows, so they stay. The faces a light's shadow map is drawn with
are the ones turned *away* from it (a one-sided material renders its back faces into the shadow
map), and those are exactly the faces no camera sees. Measured on desktop against `main`, with
only those faces removed and everything else merged:

| Removed | Pixels that change (worst section) | Verdict |
| --- | --- | --- |
| nothing (merge only) | 0.05%, 14 pixels over 8 levels | noise (float rounding of baked transforms) |
| monitor faces | 0.05% | noise, kept |
| desk `+y` / `-y` | 0.13–0.24% | over noise |
| desk `±x` | 3.4% | over noise |
| desk `-z` | 2.6% | over noise |
| room walls | 0.4% | over noise |

`omitted-faces-desk-work.png` shows one of them: the Work section with the desk's hidden faces
removed (right) against `main` (left). The shadow under the monitor loses its dark band. The same
goes for the two meshes of the room no camera sees (the top of the window wall and the left wall):
the second spotlight and the window light stand outside the room, and these walls are what keeps
their light out.

Cylinders and rounded edges: there are none. Everything procedural was already one-segment boxes
and planes, so there were no segments to lower.

## Screenshots against `main`

Nine camera positions per viewport (the four sections and five points between them), 1440×900 and
390×844, `prefers-reduced-motion`, real GPU, captured with the same script on a `main` build and
this branch.

- Mobile (no shadows): at most 96 pixels differ (0.03%) by at most 5 levels out of 255.
- Desktop: at most 0.05% of the pixels differ, with a handful over 8 levels (largest: one pixel at
  43) along shadow edges. The one exception, the About section, differs in a strip 5 pixels wide
  on the left (the HUD's vertical line, mid-animation), not in the scene.

## Out of scope, found on the way

- The door handle model is 2,144 triangles, four copies: 8,576 of the scene's 31,938 triangles
  (27%) and, with the shadow passes, most of the desktop triangle count. A lighter model or a
  decimated one is the largest single win left on triangles.
- The GLB props are still separate meshes: keyboard 14, mouse 3, books 7, chair 2. They are 26 of
  the 30 shadow casters, so 78 of the ~90 shadow draw calls. Merging them by material (as the
  handles are) is the next step towards 30 calls.
- On mobile the canvas is still the full viewport. When T7 moves it to a window of about 40% of
  the height, its aspect (about 1.15) is inside the desktop one, so the inventory's "never seen"
  still holds.
