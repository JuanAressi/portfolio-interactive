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

// Their material is replaced in code, so only the shape has to survive.
const GEOMETRY_ONLY = [
    ['strip-materials', ...CONFIG],
    ['weld'],
    ['simplify-with-normals', ...CONFIG],
    MESHOPT,
];

// books: the default 14 bits move the silhouette on screen, 16 cost 8 bytes.
// keyboard needs MESHOPT even though its source is compressed: rewriting the file drops it.
const MODELS = {
    rounded_chair: GEOMETRY_ONLY,
    mouse: GEOMETRY_ONLY,
    door_handle: GEOMETRY_ONLY,
    books: [[...MESHOPT, '--quantize-position', '16']],
    keyboard: [['strip-animations', ...CONFIG], MESHOPT],
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
