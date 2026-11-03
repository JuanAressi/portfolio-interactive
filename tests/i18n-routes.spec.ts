import { expect, test, type Page } from '@playwright/test';
import { dictionaries } from '../src/i18n/index.ts';

const ROUTES = [
    { locale: 'es', route: './', other: 'en', otherPath: 'en/' },
    { locale: 'en', route: './en/', other: 'es', otherPath: '' },
] as const;

const VIEWPORTS = [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
];

const JOB_CARD = {
    es: { role: 'Desarrollador Backend', techs: 'Tecnologías utilizadas' },
    en: { role: 'Backend Developer', techs: 'Technologies used' },
};

const CARD = '[data-work-card="monitor"]';

// Under software WebGL a frame takes seconds, enough to starve the main thread.
async function skipWebGLDraws(page: Page): Promise<void> {
    await page.addInitScript(() => {
        for (const context of [WebGLRenderingContext, WebGL2RenderingContext]) {
            context.prototype.drawArrays = () => {};
            context.prototype.drawElements = () => {};
        }
    });
}

for (const { locale, route, other, otherPath } of ROUTES) {
    const t = dictionaries[locale];

    test.describe(`${locale} route`, () => {
        test.describe('without running JS', () => {
            test.use({ javaScriptEnabled: false });

            test('the HTML has every text in its language', async ({ page }) => {
                await page.goto(route);

                await expect(page.locator('html')).toHaveAttribute('lang', locale);
                await expect(page.locator('h1')).toHaveText('Juan Aressi');
                await expect(page.locator('#work h2')).toHaveText(t.work.title);
                await expect(page.locator('#about h2')).toHaveText(t.about.title);
                await expect(page.locator('#contact h2')).toHaveText(t.contact.title);
                await expect(page.locator('[data-about-copy] p')).toHaveText([
                    t.about['paragraph-1'],
                    t.about['paragraph-2'],
                    t.about['paragraph-3'],
                    t.about['paragraph-4'],
                ]);
                await expect(page.locator('.rotating-text')).toHaveText([
                    t.header.title,
                    t.header.profession,
                ]);
                await expect(page.locator('#contact a')).toContainText([
                    t.contact.email,
                    t.contact.github,
                    t.contact.linkedin,
                    t.contact.cv,
                ]);
                await expect(page.locator('#bottom-nav .nav-label')).toHaveText([
                    t.navbar.home,
                    t.navbar.work,
                    t.navbar.about,
                    t.navbar.contact,
                    t.navbar.translate,
                ]);
                await expect(page.locator('[data-nav="work"]')).toHaveAttribute(
                    'aria-label',
                    t.navbar.work
                );
            });

            test('the headings go from h1 to h2', async ({ page }) => {
                await page.goto(route);

                await expect(page.locator('h1')).toHaveCount(1);
                await expect(page.locator('h2')).toHaveCount(3);
                await expect(page.locator('h3')).toHaveCount(0);
            });

            test('the language menu is made of links to both routes', async ({ page, baseURL }) => {
                await page.goto(route);

                const toOther = page.locator(`a[data-language="${other}"]`);
                await expect(toOther).toHaveAttribute(
                    'href',
                    `${new URL(baseURL!).pathname}${otherPath}`
                );
                await expect(page.locator(`a[data-language="${locale}"]`)).toHaveClass(/selected/);
                await expect(toOther).not.toHaveClass(/selected/);
            });
        });

        test('the monitor shows the card in the language of the route', async ({ page }) => {
            await skipWebGLDraws(page);
            await page.setViewportSize({ width: 1440, height: 900 });
            await page.goto(`${route}#work`);
            await page.locator(CARD).waitFor({ state: 'attached' });

            await page.locator('.company-item[data-job-id="capgemini"]').hover();

            const card = page.locator(CARD);
            await expect(card.locator('[data-work-field="role"]')).toHaveText(
                JOB_CARD[locale].role
            );
            await expect(card.locator('[data-work-field="techs-label"]')).toHaveText(
                JOB_CARD[locale].techs
            );
        });

        for (const viewport of VIEWPORTS) {
            test(`switching language from Work starts the other route at Work (${viewport.width}×${viewport.height})`, async ({
                page,
                baseURL,
            }) => {
                await skipWebGLDraws(page);
                // Module scripts have run by DOMContentLoaded, and nothing has been painted.
                await page.addInitScript(() => {
                    document.addEventListener('DOMContentLoaded', () => {
                        const work = document.getElementById('work')!;
                        Object.assign(window, { workTopAtStart: work.getBoundingClientRect().top });
                    });
                });
                await page.setViewportSize(viewport);
                await page.goto(route);

                await page.locator('[data-nav="work"]').click();
                await expect(page.locator('[data-nav="work"]')).toHaveAttribute(
                    'aria-current',
                    'page'
                );
                await page.locator('.dropdown-trigger').click();
                await page.locator(`a[data-language="${other}"]`).click();

                await expect(page).toHaveURL(`${baseURL}${otherPath}#work`);
                await expect(page.locator('html')).toHaveAttribute('lang', other);
                await expect(page.locator('[data-nav="work"]')).toHaveAttribute(
                    'aria-current',
                    'page'
                );
                // At the section before the first frame: nothing eases in from the top.
                await page.waitForLoadState('domcontentloaded');
                const workTopAtStart = await page.evaluate(
                    () => (window as unknown as { workTopAtStart: number }).workTopAtStart
                );
                expect(Math.abs(workTopAtStart)).toBeLessThan(1);
                expect(await page.evaluate(() => localStorage.length)).toBe(0);
            });
        }
    });
}

for (const viewport of VIEWPORTS) {
    test(`the hash follows the scroll and a reload keeps the section (${viewport.width}×${viewport.height})`, async ({
        page,
        baseURL,
    }) => {
        await skipWebGLDraws(page);
        await page.setViewportSize(viewport);
        await page.goto('./en/');
        const historyLength = await page.evaluate(() => history.length);

        await page.mouse.move(viewport.width / 2, viewport.height / 2);
        await page.evaluate(() => {
            const about = document.getElementById('about')!;
            window.scrollTo(0, about.getBoundingClientRect().top + window.scrollY);
        });
        await expect(page).toHaveURL(`${baseURL}en/#about`);
        expect(await page.evaluate(() => history.length)).toBe(historyLength);

        await page.reload();

        await expect(page).toHaveURL(`${baseURL}en/#about`);
        await expect(page.locator('[data-nav="about"]')).toHaveAttribute('aria-current', 'page');
        await expect
            .poll(() =>
                page.evaluate(() => document.getElementById('about')!.getBoundingClientRect().top)
            )
            .toBeCloseTo(0, 0);

        await page.evaluate(() => window.scrollTo(0, 0));
        await expect(page).toHaveURL(`${baseURL}en/`);
    });
}

test('Home adds no hash when switching language', async ({ page, baseURL }) => {
    await skipWebGLDraws(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('./');

    await page.locator('.dropdown-trigger').click();
    await page.locator('a[data-language="en"]').click();

    await expect(page).toHaveURL(`${baseURL}en/`);
    await expect(page.locator('[data-nav="home"]')).toHaveAttribute('aria-current', 'page');
});

test('the language in use only closes the menu', async ({ page, baseURL }) => {
    await skipWebGLDraws(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('./en/');

    await page.locator('.dropdown-trigger').click();
    await page.locator('a[data-language="en"]').click();

    await expect(page.locator('.dropdown-trigger')).toHaveAttribute('aria-expanded', 'false');
    await expect(page).toHaveURL(`${baseURL}en/`);
});
