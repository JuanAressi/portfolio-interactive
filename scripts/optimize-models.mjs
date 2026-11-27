// Rebuilds the bundled models from assets-src/models. Run with `npm run models:optimize`.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SOURCE_DIR = 'assets-src/models';
const OUTPUT_DIR = 'src/assets/models';
const CLI = 'node_modules/.bin/gltf-transform';
const CONFIG = ['--config', 'scripts/gltf-transform.config.mjs'];

const MESHOPT = ['meshopt', '--level', 'high'];

// Every model ends as one mesh per material: `join` flattens the node hierarchy (baking the
// transforms into the vertices) and merges what shares a material, `prune` drops the nodes that
// leaves empty. The scene positions the model's root, so its placement does not change.
const JOIN = [['join'], ['prune']];

// Their material is replaced in code, so only the shape has to survive. A single material makes
// the whole model one mesh.
const geometryOnly = (simplifyOptions = []) => [
    ['strip-materials', ...CONFIG],
    ['weld'],
    ['simplify-with-normals', ...CONFIG, ...simplifyOptions],
    ...JOIN,
    MESHOPT,
];

// The scene overrides the color of these, so their materials only differed in what is thrown away:
// they are one material, and with it one mesh.
const TINTED = [['merge-materials', ...CONFIG], ...JOIN];

// books: the default 14 bits move the silhouette on screen, 16 cost 8 bytes.
// keyboard needs MESHOPT even though its source is compressed: rewriting the file drops it, and
// its source has an animation three.js never plays (nothing creates an AnimationMixer).
const MODELS = {
    rounded_chair: geometryOnly(),
    mouse: geometryOnly(),
    // Four copies, about 200 × 20 px on screen at the closest the camera gets: 0.01 is the last error that
    // leaves the silhouette inside a pixel. Below ~1,000 triangles the hard edges (every vertex
    // there is duplicated per face) cannot be collapsed without changing the shading
    // (docs/perf/props-notes.md).
    door_handle: geometryOnly(['--error', '0.01']),
    books: [...TINTED, [...MESHOPT, '--quantize-position', '16']],
    keyboard: [['strip-animations', ...CONFIG], ...TINTED, MESHOPT],
};

function optimize(model, steps, workDir) {
    let input = join(SOURCE_DIR, `${model}.glb`);

    steps.forEach(([command, ...options], index) => {
        const isLast = index === steps.length - 1;
        const output = isLast ? join(OUTPUT_DIR, `${model}.glb`) : join(workDir, `${index}.glb`);
        execFileSync(CLI, [command, input, output, ...options], { stdio: 'pipe' });
        input = output;
    });
}

const workDir = mkdtempSync(join(tmpdir(), 'optimize-models-'));

try {
    for (const [model, steps] of Object.entries(MODELS)) {
        optimize(model, steps, workDir);
        const before = statSync(join(SOURCE_DIR, `${model}.glb`)).size;
        const after = statSync(join(OUTPUT_DIR, `${model}.glb`)).size;
        console.log(`${model}: ${before} → ${after} bytes`);
    }
} finally {
    rmSync(workDir, { recursive: true });
}
