// Measures what the 3D scene costs, per section and viewport, on a real GPU and on SwiftShader,
// and writes docs/perf/baseline.{json,md}. Needs a fresh `npm run build`.
// Usage: npm run scene:profile [-- --modes gl-egl,swiftshader] [--out docs/perf/baseline]
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { preview } from 'astro';
import { chromium } from '@playwright/test';
import { SECTIONS, renderMarkdown, summarize } from './profile-lib.mjs';

const MODES = {
    'gl-egl': ['--use-angle=gl-egl', '--ignore-gpu-blocklist'],
    swiftshader: ['--use-angle=swiftshader'],
};
const VIEWPORTS = [
    { name: 'desktop', viewport: { width: 1440, height: 900 }, cpuThrottle: 1 },
    { name: 'mobile', viewport: { width: 390, height: 844 }, cpuThrottle: 4, isMobile: true },
];
const SCROLL_MS = 5000;
const PORT = 4398;
const SETTLE_MS = 1500;
// The scene adds models as they arrive: it is ready when the mesh count stops changing.
const STABLE_POLLS = 3;
const READY_TIMEOUT_MS = 180_000;

function option(name, fallback) {
    const index = process.argv.indexOf(`--${name}`);
    return index === -1 ? fallback : process.argv[index + 1];
}

const modes = option('modes', 'gl-egl,swiftshader').split(',');
const outBase = fileURLToPath(new URL(`../${option('out', 'docs/perf/baseline')}`, import.meta.url));

for (const mode of modes) {
    if (!MODES[mode]) throw new Error(`Unknown mode "${mode}". Use ${Object.keys(MODES).join(', ')}.`);
}
if (!existsSync(new URL('../dist/index.html', import.meta.url))) {
    throw new Error('dist/ not found: run `npm run build` first.');
}

async function waitForScene(page) {
    await page.waitForFunction(() => Boolean(window.__perf), null, { timeout: READY_TIMEOUT_MS });
    let previous = -1;
    let stable = 0;
    const deadline = Date.now() + READY_TIMEOUT_MS;
    while (stable < STABLE_POLLS && Date.now() < deadline) {
        await page.waitForTimeout(1000);
        const { meshes } = await page.evaluate(() => window.__perf.snapshot());
        stable = meshes === previous ? stable + 1 : 0;
        previous = meshes;
    }
    if (stable < STABLE_POLLS) throw new Error('The scene never finished loading.');
}

// Scrolls from the top to the bottom of each section, as the scroll code computes them.
function sectionRanges(page) {
    return page.evaluate(ids => {
        const isNative = window.innerWidth < 768 || window.innerHeight < 600;
        const read = id => {
            const section = document.getElementById(id);
            return isNative ? section.getBoundingClientRect().top + window.scrollY : section.offsetTop;
        };
        const max = isNative
            ? document.documentElement.scrollHeight - window.innerHeight
            : document.querySelector('.FakeScroll').offsetHeight - window.innerHeight;
        const tops = ids.map(read);
        // The last section may start at the very bottom of the page: it still has to move.
        const minTravel = window.innerHeight * 0.35;
        return Object.fromEntries(
            ids.map((id, i) => {
                const to = Math.min(tops[i + 1] ?? max, max);
                return [id, { from: Math.max(0, Math.min(tops[i], to - minTravel)), to }];
            })
        );
    }, SECTIONS);
}

function scrollThrough(page, { from, to }) {
    return page.evaluate(
        ({ from, to, duration }) =>
            new Promise(resolve => {
                const start = performance.now();
                function step(now) {
                    const t = Math.min((now - start) / duration, 1);
                    window.scrollTo(0, from + (to - from) * t);
                    if (t < 1) requestAnimationFrame(step);
                    else resolve();
                }
                requestAnimationFrame(step);
            }),
        { from, to, duration: SCROLL_MS }
    );
}

async function measureSection(page, cdp, range) {
    await page.evaluate(top => window.scrollTo(0, top), range.from);
    await page.waitForTimeout(SETTLE_MS);

    await page.evaluate(() => window.__perf.start());
    await scrollThrough(page, range);
    const recording = await page.evaluate(() => window.__perf.stop());
    const snapshot = await page.evaluate(() => window.__perf.snapshot());

    await cdp.send('HeapProfiler.collectGarbage');
    const { usedSize } = await cdp.send('Runtime.getHeapUsage');

    const median = values => summarize(values).p50;
    const frames = recording.frames;
    return {
        calls: median(frames.map(f => f.calls)),
        triangles: median(frames.map(f => f.triangles)),
        peak: {
            calls: Math.max(...frames.map(f => f.calls)),
            triangles: Math.max(...frames.map(f => f.triangles)),
        },
        main: {
            calls: median(frames.map(f => f.main.calls)),
            triangles: median(frames.map(f => f.main.triangles)),
        },
        shadow: {
            calls: median(frames.map(f => f.shadow.calls)),
            triangles: median(frames.map(f => f.shadow.triangles)),
        },
        textures: snapshot.memory.textures,
        geometries: snapshot.memory.geometries,
        programs: snapshot.programs,
        renders: frames.length,
        frameMs: summarize(recording.frameMs),
        renderMs: summarize(recording.renderMs),
        heapMB: usedSize / 1024 / 1024,
    };
}

const server = await preview({ server: { port: PORT, host: '127.0.0.1' }, logLevel: 'warn' });
const baseUrl = `http://127.0.0.1:${server.port ?? PORT}/?debug=perf`;
const results = [];
const environment = { renderers: {}, chromium: '', node: process.version, commit: '' };
let inventory = null;

try {
    environment.commit = execFileSync('git', ['rev-parse', '--short', 'HEAD']).toString().trim();

    for (const mode of modes) {
        const browser = await chromium.launch({ args: MODES[mode] });
        environment.chromium = `Chromium ${browser.version()}`;

        for (const { name, viewport, cpuThrottle, isMobile } of VIEWPORTS) {
            console.log(`${mode} · ${name}`);
            const context = await browser.newContext({ viewport, isMobile, hasTouch: isMobile });
            const page = await context.newPage();
            const cdp = await context.newCDPSession(page);
            const problems = [];
            page.on('pageerror', error => problems.push(error.message));

            await page.goto(baseUrl);
            await waitForScene(page);
            await page.evaluate(() => document.fonts.ready);

            environment.renderers[mode] ??= await page.evaluate(() => {
                const gl = document.createElement('canvas').getContext('webgl2');
                const info = gl.getExtension('WEBGL_debug_renderer_info');
                return gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER);
            });

            // The camera path and the geometry don't depend on the GPU: once is enough.
            if (!inventory && name === 'desktop') {
                inventory = await page.evaluate(() => window.__perf.inventory());
            }

            if (cpuThrottle > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpuThrottle });

            const ranges = await sectionRanges(page);
            for (const section of SECTIONS) {
                const cell = await measureSection(page, cdp, ranges[section]);
                results.push({ mode, viewport: name, section, ...cell });
                console.log(
                    `  ${section}: ${cell.calls} calls, ${cell.triangles} tris, ` +
                        `frame p95 ${cell.frameMs.p95.toFixed(1)} ms (${cell.renders} renders)`
                );
            }
            if (problems.length) throw new Error(`The page threw: ${problems.join('; ')}`);
            await context.close();
        }
        await browser.close();
    }
} finally {
    await server.stop();
}

const data = {
    generatedAt: new Date().toISOString(),
    environment,
    config: { modes, scrollMs: SCROLL_MS, mobileCpuThrottle: 4 },
    results,
    inventory,
};

await mkdir(dirname(outBase), { recursive: true });
await writeFile(`${outBase}.json`, `${JSON.stringify(data, null, 2)}\n`);
await writeFile(`${outBase}.md`, `${renderMarkdown(data)}\n`);
console.log(`Wrote ${outBase}.{json,md}`);
