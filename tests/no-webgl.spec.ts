import { expect, test } from '@playwright/test';
import { collectConsoleProblems } from './console-problems.ts';

const VIEWPORTS = [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
];

for (const viewport of VIEWPORTS) {
    test(`the page works without WebGL at ${viewport.width}×${viewport.height}`, async ({
        page,
    }) => {
        const problems = collectConsoleProblems(page);

        const requests: string[] = [];
        page.on('request', request => requests.push(request.url()));

        await page.addInitScript(() => {
            const original = HTMLCanvasElement.prototype.getContext;
            HTMLCanvasElement.prototype.getContext = function (
                this: HTMLCanvasElement,
                type: string,
                ...options: unknown[]
            ) {
                if (type === 'webgl' || type === 'webgl2') {
                    Object.assign(window, { webglRefused: true });
                    return null;
                }
                return Reflect.apply(original, this, [type, ...options]);
            } as typeof original;
        });

        await page.setViewportSize(viewport);
        await page.goto('./');
        await page.waitForFunction(() => 'webglRefused' in window);

        // Navigation.
        const contact = page.locator('[data-nav="contact"]');
        await contact.click();
        await expect(contact).toHaveAttribute('aria-current', 'page');

        // Scroll, with the wheel and from the top.
        await page.locator('[data-nav="home"]').click();
        await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
        await page.mouse.move(viewport.width / 2, viewport.height / 2);
        await page.mouse.wheel(0, viewport.height);
        await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
        await expect
            .poll(() => page.locator('#scroll-progress').evaluate(bar => bar.style.height))
            .not.toBe('0%');

        // Language.
        await page.locator('.dropdown-trigger').click();
        await page.locator('[data-language="es"]').click();
        await expect(page.locator('[data-translate="work.title"]')).toHaveText(
            'Experiencia laboral'
        );

        await expect(page.locator('canvas')).toHaveCount(0);
        expect(requests.filter(url => /\/_astro\/(scene|three)\./.test(url))).toEqual([]);
        expect(requests.filter(url => url.endsWith('.glb'))).toEqual([]);
        expect(problems).toEqual([]);
    });
}
