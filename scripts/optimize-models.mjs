// Rebuilds the bundled models from assets-src/models. Run with `npm run models:optimize`.
// books.glb and keyboard.glb keep their own materials and are not processed.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const MODELS = ['rounded_chair', 'mouse', 'door_handle'];
const SOURCE_DIR = 'assets-src/models';
const OUTPUT_DIR = 'src/assets/models';
const CLI = 'node_modules/.bin/gltf-transform';
const CONFIG = ['--config', 'scripts/gltf-transform.config.mjs'];

const STEPS = [
    ['strip-materials', ...CONFIG],
    ['weld'],
    ['simplify-with-normals', ...CONFIG],
    ['meshopt', '--level', 'high'],
];

function optimize(model, workDir) {
    let input = join(SOURCE_DIR, `${model}.glb`);

    STEPS.forEach(([command, ...options], index) => {
        const isLast = index === STEPS.length - 1;
        const output = isLast ? join(OUTPUT_DIR, `${model}.glb`) : join(workDir, `${index}.glb`);
        execFileSync(CLI, [command, input, output, ...options], { stdio: 'pipe' });
        input = output;
    });
}

const workDir = mkdtempSync(join(tmpdir(), 'optimize-models-'));

try {
    for (const model of MODELS) {
        optimize(model, workDir);
        const before = statSync(join(SOURCE_DIR, `${model}.glb`)).size;
        const after = statSync(join(OUTPUT_DIR, `${model}.glb`)).size;
        console.log(`${model}: ${before} → ${after} bytes`);
    }
} finally {
    rmSync(workDir, { recursive: true });
}
