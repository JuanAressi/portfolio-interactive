import { expect, test, type Page, type Route } from '@playwright/test';
import { collectConsoleProblems } from './console-problems.ts';

// One pixel either side would do. Same height and nearly the same width keep the same objects in
// the camera, so a change in draw calls can only come from the tier.
const FULL = { width: 800, height: 800 };
const LIGHT = { width: 760, height: 800 };

const CHAIR = '**/rounded_chair.*.glb';
const CANVAS = '#canvas-container canvas';

type SceneStats = { mainFrame: number; lastMainFrame: number; shadowDraws: number };

function readStats(page: Page): Promise<SceneStats> {
    return page.evaluate(() => ({
        ...(window as unknown as { sceneStats: SceneStats }).sceneStats,
    }));
}

// Replaces draw calls with counters. Whatever is drawn into a framebuffer is the shadow pass.
async function countDraws(page: Page): Promise<void> {
    await page.addInitScript(() => {
        const stats = { mainFrame: 0, lastMainFrame: 0, shadowDraws: 0 };
        Object.assign(window, { sceneStats: stats });
        let isOffscreen = false;

        const { bindFramebuffer } = WebGL2RenderingContext.prototype;
        WebGL2RenderingContext.prototype.bindFramebuffer = function (target, framebuffer) {
            isOffscreen = framebuffer !== null;
            bindFramebuffer.call(this, target, framebuffer);
        };

        const countDraw = () => {
            if (isOffscreen) stats.shadowDraws += 1;
            else stats.mainFrame += 1;
        };
        WebGL2RenderingContext.prototype.drawArrays = countDraw;
        WebGL2RenderingContext.prototype.drawElements = countDraw;

        const closeFrame = () => {
            if (stats.mainFrame > 0) stats.lastMainFrame = stats.mainFrame;
            stats.mainFrame = 0;
            requestAnimationFrame(closeFrame);
        };
        requestAnimationFrame(closeFrame);
    });
}

function canvasPixelRatio(page: Page): Promise<number> {
    return page.locator(CANVAS).evaluate(element => {
        const canvas = element as HTMLCanvasElement;
        return canvas.width / canvas.clientWidth;
    });
}

// The chair only enters the picture near the end of the camera path.
async function drawsAtTheBottom(page: Page): Promise<number> {
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    let previous = -1;
    await expect(async () => {
        await page.mouse.move(400, 300 + Math.random() * 100);
        await page.waitForTimeout(300);
        const { lastMainFrame } = await readStats(page);
        const isStable = lastMainFrame === previous;
        previous = lastMainFrame;
        expect(isStable).toBe(true);
    }).toPass();
    return previous;
}

async function expectNoShadowPass(page: Page): Promise<void> {
    const before = (await readStats(page)).shadowDraws;
    await page.mouse.move(100, 100);
    await page.mouse.move(300, 200);
    await page.waitForTimeout(300);
    expect((await readStats(page)).shadowDraws).toBe(before);
}

async function expectShadowPass(page: Page): Promise<void> {
    const before = (await readStats(page)).shadowDraws;
    await expect(async () => {
        await page.mouse.move(100 + Math.random() * 300, 100);
        await page.waitForTimeout(100);
        expect((await readStats(page)).shadowDraws).toBeGreaterThan(before);
    }).toPass();
}

test.describe('scene tier', () => {
    test.use({ deviceScaleFactor: 2 });

    let problems: string[];
    let requestedModels: string[];

    test.beforeEach(async ({ page }) => {
        problems = collectConsoleProblems(page);
        requestedModels = [];
        page.on('request', request => {
            if (request.url().endsWith('.glb')) requestedModels.push(request.url());
        });
        await countDraws(page);
    });

    test.afterEach(() => {
        expect(problems).toEqual([]);
    });

    const chairRequests = () => requestedModels.filter(url => url.includes('rounded_chair')).length;

    test('a phone gets the light scene: 1x, no shadows, no chair', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto('./');
        await expect(page.locator(CANVAS)).toHaveClass(/is-rendered/);
        await expect.poll(() => requestedModels.length).toBe(4);
        await page.waitForLoadState('networkidle');

        expect(chairRequests()).toBe(0);
        expect(await canvasPixelRatio(page)).toBe(1);
        expect((await readStats(page)).shadowDraws).toBe(0);
    });

    test('a short desktop window counts as mobile', async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 599 });
        await page.goto('./');
        await expect(page.locator(CANVAS)).toHaveClass(/is-rendered/);
        await expect.poll(() => requestedModels.length).toBe(4);

        expect(chairRequests()).toBe(0);
    });

    async function openScene(page: Page, viewport: { width: number; height: number }) {
        await page.setViewportSize(viewport);
        await page.goto('./');
        await expect(page.locator(CANVAS)).toHaveClass(/is-rendered/);
        await page.waitForLoadState('networkidle');
    }

    test('crossing the breakpoint switches tier both ways without reloading', async ({ page }) => {
        await openScene(page, LIGHT);
        await page.evaluate(() => Object.assign(window, { sameDocument: true }));

        const lightDraws = await drawsAtTheBottom(page);
        await expectNoShadowPass(page);

        await page.setViewportSize(FULL);
        await expect.poll(() => chairRequests()).toBe(1);
        await expect.poll(() => canvasPixelRatio(page)).toBe(1.5);
        await page.waitForLoadState('networkidle');
        await expectShadowPass(page);
        const fullDraws = await drawsAtTheBottom(page);
        expect(fullDraws).toBeGreaterThan(lightDraws);

        await page.setViewportSize(LIGHT);
        await expect.poll(() => canvasPixelRatio(page)).toBe(1);
        expect(await drawsAtTheBottom(page)).toBe(lightDraws);
        await expectNoShadowPass(page);

        await page.setViewportSize(FULL);
        await expect.poll(() => canvasPixelRatio(page)).toBe(1.5);
        expect(await drawsAtTheBottom(page)).toBe(fullDraws);
        await expectShadowPass(page);

        expect(chairRequests()).toBe(1);
        expect(await page.evaluate(() => 'sameDocument' in window)).toBe(true);
    });

    test('a chair that arrives after going back to mobile stays hidden', async ({ page }) => {
        let chair: Route | undefined;
        await page.route(CHAIR, route => {
            chair = route;
        });

        await openScene(page, LIGHT);
        const lightDraws = await drawsAtTheBottom(page);

        await page.setViewportSize(FULL);
        await expect.poll(() => chair).toBeDefined();
        await page.setViewportSize(LIGHT);
        await expect.poll(() => canvasPixelRatio(page)).toBe(1);
        await chair!.continue();
        await page.waitForLoadState('networkidle');

        expect(await drawsAtTheBottom(page)).toBe(lightDraws);
    });

    test('resizing while the chair loads does not add a second one', async ({ page }) => {
        let chair: Route | undefined;
        await page.route(CHAIR, route => {
            chair = route;
        });

        await page.setViewportSize(FULL);
        await page.goto('./');
        await expect.poll(() => chair).toBeDefined();
        await page.setViewportSize({ ...FULL, width: FULL.width + 40 });
        await page.setViewportSize(FULL);
        await expect(page.locator(CANVAS)).toHaveClass(/is-rendered/);

        await chair!.continue();
        await page.waitForLoadState('networkidle');
        const draws = await drawsAtTheBottom(page);

        // three.js merges requests for a model already on its way, so the network can't tell: a
        // second load is a second chair in the scene.
        const reference = await page.context().newPage();
        await countDraws(reference);
        await openScene(reference, FULL);
        expect(draws).toBe(await drawsAtTheBottom(reference));
    });
});
