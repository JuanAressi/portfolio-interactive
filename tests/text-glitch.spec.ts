import { expect, test, type Browser, type Page } from '@playwright/test';

const SELECTOR = '[data-glitch]';

type GlitchWindow = Window & { glitchMutations: number };

const readTexts = (page: Page) =>
    page.locator(SELECTOR).evaluateAll(elements => elements.map(element => element.textContent));

const glitchMutations = (page: Page) =>
    page.evaluate(() => (window as unknown as GlitchWindow).glitchMutations);

// All the characters are revealed a few frames before the last write, so the text matching is not
// enough: the effect is over when the writes stop.
async function waitForEffectToEnd(page: Page): Promise<void> {
    let previous = -1;
    await expect
        .poll(
            async () => {
                const count = await glitchMutations(page);
                const hasEnded = count > 0 && count === previous;
                previous = count;
                return hasEnded;
            },
            { intervals: [250] }
        )
        .toBe(true);
}

// What the server sent: the text before anything can have touched it.
async function renderedTexts(browser: Browser, route: string, baseURL: string): Promise<string[]> {
    const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(route);
    const texts = (await readTexts(page)) as string[];
    await context.close();
    return texts;
}

async function prepare(page: Page): Promise<void> {
    await page.addInitScript(
        ({ selector }) => {
            for (const context of [WebGLRenderingContext, WebGL2RenderingContext]) {
                context.prototype.drawArrays = () => {};
                context.prototype.drawElements = () => {};
            }

            const target = window as unknown as GlitchWindow;
            target.glitchMutations = 0;
            new MutationObserver(records => {
                for (const record of records) {
                    const element = record.target as Element;
                    // The parser only adds nodes: a removal is the text being replaced.
                    if (element.matches?.(selector) && record.removedNodes.length > 0) {
                        target.glitchMutations += 1;
                    }
                }
            }).observe(document, { childList: true, subtree: true });
        },
        { selector: SELECTOR }
    );
}

test.describe('with motion allowed', () => {
    test.use({ contextOptions: { reducedMotion: 'no-preference' } });

    test('the first load scrambles the text and leaves it identical', async ({
        page,
        browser,
        baseURL,
    }) => {
        const rendered = await renderedTexts(browser, './', baseURL!);
        expect(rendered).toHaveLength(18);
        expect(rendered.every(text => text.trim() !== '')).toBe(true);

        await prepare(page);
        await page.goto('./');

        await waitForEffectToEnd(page);
        expect(await readTexts(page)).toEqual(rendered);
    });

    test('a reload does not replay it', async ({ page }) => {
        await prepare(page);
        await page.goto('./');
        await expect.poll(() => glitchMutations(page)).toBeGreaterThan(0);

        await page.reload();
        await page.waitForLoadState('load');
        await page.evaluate(() => new Promise(requestAnimationFrame));

        expect(await glitchMutations(page)).toBe(0);
    });

    test('arriving from a language link plays it once, consuming the flag', async ({
        page,
        browser,
        baseURL,
    }) => {
        const rendered = await renderedTexts(browser, './en/', baseURL!);

        await prepare(page);
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.goto('./');
        await page.locator('#bottom-nav').hover();
        await page.locator('.dropdown-trigger').click();
        await page.locator('a[data-language="en"]').click();
        await expect(page.locator('html')).toHaveAttribute('lang', 'en');

        await waitForEffectToEnd(page);
        expect(await readTexts(page)).toEqual(rendered);
        expect(await page.evaluate(() => Object.keys(sessionStorage))).not.toContain(
            'portfolio:language-switched'
        );

        await page.reload();
        await page.waitForLoadState('load');
        await page.evaluate(() => new Promise(requestAnimationFrame));
        expect(await glitchMutations(page)).toBe(0);
    });
});

test('prefers-reduced-motion gets the text with no effect', async ({ page }) => {
    await prepare(page);
    await page.goto('./');
    await page.waitForLoadState('load');
    await page.evaluate(() => new Promise(requestAnimationFrame));

    expect(await glitchMutations(page)).toBe(0);
});
