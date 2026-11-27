# T14b props

Before: `geometry.{json,md}` (T14). After: `props.{json,md}`. Side by side: `props-comparison.md`.
Both from `npm run scene:profile`; screenshots with `npm run scene:capture` / `npm run scene:diff`.

## What changed

- **One mesh per model.** `npm run models:optimize` now ends every model with `join` (flattens the
  node hierarchy, bakes the transforms into the vertices and merges what shares a material) and
  `prune`. Keyboard 12 meshes / 25 nodes → 1 / 1, mouse 3 → 1, books 7 → 1, chair 2 → 1, door
  handle 4 → 1. The bounding boxes are identical to the source's.
- **Materials that only differed in what the scene overrides are one.** The keyboard (4 materials)
  and the books (7) get their color from `tint` in `scene.js`, so the new `merge-materials` step
  keeps the first one of each file and `join` can make them a single mesh. Their roughness and
  metalness (0.5 / 0 and 0.6 / 0) were the same across materials, so the look is the same.
- **No animation, no unused nodes.** The keyboard's animation was already dropped; the nodes
  `join` leaves behind are pruned (one node per file).
- **Door handles: 2,144 → 1,220 triangles each** (4,880 in the scene, 8,576 before). Four copies
  merged into `desk-handles`, one draw call (and one in each shadow pass). An `InstancedMesh`
  would cost the same single call but shares the uvs of one handle among the four, and the bake
  of T15 needs each handle to have its own, so the merge stays.

## The handle's simplification

The model is simplified with `simplify-with-normals`, which can now take `--error`, `--ratio` and
`--normal-weight`. Measured as the pixels that differ from `main` (threshold 8 of 255) in the four
camera positions where the handles are on screen (desktop, 1440×900, real GPU):

| Model | Triangles | Pixels over threshold (positions 5–8) |
| --- | --- | --- |
| `main` against itself, two captures | 2,144 | 0 (max 1 level) |
| error 0.002 (what `main` ships) | 2,144 | 19–43 |
| **error 0.01** | **1,220** | **43–136** |
| error 0.02 | 1,112 | 43–257 |
| error 0.05 | 1,038 | 37–483, and the silhouette moves: thinner bar, bent posts |

Even the unchanged model differs by ~30 pixels: that is the floor of merging and re-quantizing the
other models (isolated pixels at the edges of the keycaps). The handle on screen is about
200 × 20 px, so 0.01 is the last error that keeps its silhouette inside a pixel (`props-crops.png`,
left `main`, right this branch).

Below ~1,000 triangles it does not go: the handle has hard edges, so each of its vertices is
duplicated per face and the simplifier cannot collapse them without changing the shading. Neither
a lower normal weight (0.02, 0.1) nor a target ratio (down to 3%) moved the floor. Going further
would need remodelling the handle, not decimating it.

## Result (real GPU, Intel Iris Xe)

| | T14 | T14b |
| --- | --- | --- |
| Draw calls, desktop (shadow passes included) | 97–124 | 31–36 |
| Draw calls, mobile | 7–25 | 7–10 |
| Triangles, desktop | 104,500–127,600 | 89,700–112,800 |
| Triangles, mobile | 8,856–25,198 | 5,160–21,502 |
| Render p95 (ms), desktop | 2.2–2.5 | 0.7–1.0 |
| Frame p95 (ms), desktop / mobile | 16.7–16.8 | 16.7–16.8 |
| Meshes / material instances / shadow casters | 34 / 23 / 30 | 12 / 11 / 8 |

The budget of `baseline.md` (≤ 30 calls) is one to six calls away on desktop; what is left is the
shadow passes (two spotlights and the window light), which T15 removes for static geometry. SwiftShader
numbers in `props-comparison.md` move both ways between runs (software rendering, seconds per
frame): read the draw calls and triangles there, not the times.

## Screenshots against `main`

Nine camera positions per viewport, 1440×900 and 390×844, `prefers-reduced-motion`, real GPU, same
script on a `main` build and on this branch (`npm run scene:capture`, `npm run scene:diff`). Two
captures of `main` differ by at most 1 level in every pixel.

- Positions 0–4 (Home to About's start): identical (at most 1 level).
- Positions 5–8: 0.003–0.010% of the pixels over 8 levels on desktop (at most 136 pixels), 0.003–
  0.008% on mobile (at most 26). They are the handles (silhouette edge, see the crops) and isolated
  pixels along the keycap edges of the keyboard. `props-crops.png` shows the three biggest
  clusters: keyboard, left handle and right handle.

## Out of scope, found on the way

- The mouse (8,004) and the keyboard (8,322) are 58% of the scene's 28,242 triangles; decimating
  them is a separate ticket (the ticket asked only to merge them).
- `scene:profile`'s `--compare` labels the "before" with the commit recorded in the old JSON
  (`25f48d5` for `geometry.json`), which is the T14 build, not the merge commit.
