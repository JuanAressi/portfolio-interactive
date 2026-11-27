// Screenshots of the scene at nine points of the camera path, 1440×900 and 390×844, on the real
// GPU, from any built `dist/`: the current one, or one of another commit to compare against.
// Usage: npm run scene:capture -- --out <dir> [--dist dist] [--viewport desktop|mobile] [--points 6,7]
//        npm run scene:diff -- <dirA> <dirB> [--out <dir>]   (compares two captures)
// A page of another commit is built with `SITE=… npm run build` in a worktree and passed as --dist.
import { createReadStream, existsSync, statSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { chromium } from '@playwright/test';

const VIEWPORTS = [
    { name: 'desktop', viewport: { width: 1440, height: 900 } },
    { name: 'mobile', viewport: { width: 390, height: 844 }, isMobile: true },
];
// The four sections and five points between them, as equal steps of the page's scroll.
const POINTS = 9;
const SETTLE_MS = 2500;
const READY_TIMEOUT_MS = 180_000;
const STABLE_POLLS = 3;

const TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.glb': 'model/gltf-binary',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2',
    '.xml': 'application/xml',
    '.txt': 'text/plain',
};

function option(name, fallback) {
    const index = process.argv.indexOf(`--${name}`);
    return index === -1 ? fallback : process.argv[index + 1];
}

function serve(root) {
    const server = createServer((request, response) => {
        const pathname = decodeURIComponent(new URL(request.url, 'http://x').pathname);
        let file = join(root, normalize(pathname));
        if (!file.startsWith(root)) return response.writeHead(403).end();
        if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
        if (!existsSync(file)) return response.writeHead(404).end();
        response.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
        createReadStream(file).pipe(response);
    });
    return new Promise(done => server.listen(0, '127.0.0.1', () => done(server)));
}

// The scene adds models as they arrive: it is ready when the mesh count stops changing.
async function waitForScene(page) {
    await page.waitForFunction(() => Boolean(window.__perf), null, { timeout: READY_TIMEOUT_MS });
    let previous = -1;
    let stable = 0;
    while (stable < STABLE_POLLS) {
        await page.waitForTimeout(1000);
        const { meshes } = await page.evaluate(() => window.__perf.snapshot());
        stable = meshes === previous ? stable + 1 : 0;
        previous = meshes;
    }
}

const onlyViewport = option('viewport', null);
const onlyPoints = option('points', null)?.split(',').map(Number);
const outDir = resolve(option('out', ''));
const distDir = resolve(option('dist', 'dist'));
if (!option('out', '')) throw new Error('Pass --out <dir>.');
if (!existsSync(join(distDir, 'index.html'))) throw new Error(`${distDir} has no build.`);
await mkdir(outDir, { recursive: true });

const server = await serve(distDir);
const baseUrl = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ args: ['--use-angle=gl-egl', '--ignore-gpu-blocklist'] });

try {
    for (const { name, viewport, isMobile } of VIEWPORTS) {
        if (onlyViewport && name !== onlyViewport) continue;
        const context = await browser.newContext({
            viewport,
            isMobile,
            hasTouch: isMobile,
            reducedMotion: 'reduce',
        });
        const page = await context.newPage();
        const problems = [];
        page.on('pageerror', error => problems.push(error.message));

        await page.goto(`${baseUrl}/?debug=perf`);
        await waitForScene(page);
        await page.evaluate(() => document.fonts.ready);

        const max = await page.evaluate(() => {
            const isNative = window.innerWidth < 768 || window.innerHeight < 600;
            return isNative
                ? document.documentElement.scrollHeight - window.innerHeight
                : document.querySelector('.FakeScroll').offsetHeight - window.innerHeight;
        });

        for (let point = 0; point < POINTS; point++) {
            if (onlyPoints && !onlyPoints.includes(point)) continue;
            await page.evaluate(top => window.scrollTo(0, top), (max * point) / (POINTS - 1));
            await page.waitForTimeout(SETTLE_MS);
            await page.screenshot({ path: join(outDir, `${name}-${point}.png`) });
        }
        if (problems.length) throw new Error(`The page threw: ${problems.join('; ')}`);
        await context.close();
        console.log(`${name}: ${POINTS} captures`);
    }
} finally {
    await browser.close();
    server.close();
}
