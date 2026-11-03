import { expect, test, type Page, type Route } from '@playwright/test';

const THREE_CHUNK = '**/_astro/three.*.js';
const CANVAS = '#canvas-container canvas';

// Software draw calls take seconds. Keeps the call, and notes how the canvas looked when the first
// one happened.
async function recordFirstDraw(page: Page): Promise<void> {
    await page.addInitScript(() => {
        function onDraw(this: WebGL2RenderingContext) {
            const target = window as unknown as { opacityAtFirstDraw?: string };
            target.opacityAtFirstDraw ??= getComputedStyle(this.canvas as Element).opacity;
        }
        WebGL2RenderingContext.prototype.drawArrays = onDraw;
        WebGL2RenderingContext.prototype.drawElements = onDraw;
    });
}

test('nav and language menu work while three.js is still on its way', async ({ page }) => {
    let three: Route | undefined;
    await page.route(THREE_CHUNK, route => {
        three = route;
    });
    await recordFirstDraw(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('./');
    await expect.poll(() => three).toBeDefined();

    await page.locator('[data-nav="about"]').click();
    await expect(page.locator('[data-nav="about"]')).toHaveAttribute('aria-current', 'page');
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    await expect
        .poll(() => page.locator('#content').evaluate(element => element.style.transform))
        .not.toBe('translateY(0px)');

    // The other route starts its own wait for the chunk.
    three = undefined;
    await page.locator('.dropdown-trigger').click();
    await page.locator('[data-language="en"]').click();
    await expect(page.locator('[data-about-copy]')).toContainText("I'm a Systems Engineer");
    await expect(page.locator('[data-nav="about"]')).toHaveAttribute('aria-current', 'page');
    await expect.poll(() => three).toBeDefined();

    await expect(page.locator(CANVAS)).toHaveCount(0);
    await three!.continue();
    await expect(page.locator(CANVAS)).toHaveClass(/is-rendered/);
});

test('the scene is requested after the first paint', async ({ page }) => {
    await recordFirstDraw(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('./');
    await expect(page.locator(CANVAS)).toHaveClass(/is-rendered/);

    const { firstPaint, sceneRequest } = await page.evaluate(() => ({
        firstPaint: performance.getEntriesByName('first-paint')[0].startTime,
        sceneRequest: performance
            .getEntriesByType('resource')
            .find(entry => entry.name.includes('/_astro/scene.'))!.startTime,
    }));
    expect(sceneRequest).toBeGreaterThan(firstPaint);
});

for (const { reducedMotion, duration } of [
    { reducedMotion: 'no-preference', duration: '0.4s' },
    { reducedMotion: 'reduce', duration: '0s' },
]) {
    test.describe(`with prefers-reduced-motion: ${reducedMotion}`, () => {
        test.use({ contextOptions: { reducedMotion: reducedMotion as 'reduce' } });

        test(`the canvas appears after its first frame, over ${duration}`, async ({ page }) => {
            await recordFirstDraw(page);
            await page.setViewportSize({ width: 1280, height: 800 });
            await page.goto('./');

            const canvas = page.locator(CANVAS);
            await expect(canvas).toHaveClass(/is-rendered/);
            await expect(canvas).toHaveCSS('transition-duration', duration);
            await expect(canvas).toHaveCSS('opacity', '1');

            const opacityAtFirstDraw = await page.evaluate(
                () => (window as unknown as { opacityAtFirstDraw: string }).opacityAtFirstDraw
            );
            expect(opacityAtFirstDraw).toBe('0');
        });
    });
}
