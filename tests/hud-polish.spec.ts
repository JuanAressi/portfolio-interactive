import { expect, test, type Page } from '@playwright/test';

const CARD_SELECTOR = '[data-work-card="monitor"]';
const DENSE_JOB_IDS = ['ignitix', 'capgemini', 'secco', 'persiscal', 'sacsi'] as const;
const ROUTES = { en: './en/', es: './' } as const;
const LANGUAGES = Object.keys(ROUTES) as Array<keyof typeof ROUTES>;

// This suite only reads the DOM. Under software WebGL a frame takes seconds, enough to starve
// the main thread and time tests out, so draw calls are skipped. The render loop still runs.
async function skipWebGLDraws(page: Page): Promise<void> {
    await page.addInitScript(() => {
        for (const context of [WebGLRenderingContext, WebGL2RenderingContext]) {
            context.prototype.drawArrays = () => {};
            context.prototype.drawElements = () => {};
        }
    });
}

async function openPortfolio(page: Page, route: string = ROUTES.es): Promise<void> {
    await skipWebGLDraws(page);
    await page.goto(route);
    await page.locator(CARD_SELECTOR).waitFor({ state: 'attached' });
    await page.addStyleTag({
        content: `
            *, *::before, *::after {
                animation-delay: 0s !important;
                animation-duration: 0s !important;
                transition-duration: 0s !important;
            }
        `,
    });
    await page.evaluate(() => document.fonts.ready);
}

async function expectActiveCardFits(page: Page, jobId: (typeof DENSE_JOB_IDS)[number]) {
    const result = await page.evaluate(
        ({ activeJob, cardSelector }) => {
            const item = document.querySelector<HTMLElement>(
                `.company-item[data-job-id="${activeJob}"]`
            );
            item?.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));

            const root = document.querySelector<HTMLElement>(cardSelector);
            if (!root) throw new Error('Monitor card not found');
            const tolerance = 1;
            const clampedSelectors = [
                '[data-work-field="outcome"]',
                '[data-work-field="bullets"] li',
            ];

            const truncated = clampedSelectors.flatMap(selector =>
                Array.from(root.querySelectorAll<HTMLElement>(selector))
                    .filter(element => element.scrollHeight > element.clientHeight + tolerance)
                    .map(element => element.textContent?.trim() || element.tagName)
            );

            const metrics = {
                activeJob: root.dataset.activeJob,
                truncated,
                cardOverflows:
                    root.scrollHeight > root.clientHeight + tolerance ||
                    root.scrollWidth > root.clientWidth + tolerance,
            };
            document
                .getElementById('work')
                ?.dispatchEvent(new MouseEvent('mouseleave', { bubbles: false }));
            return metrics;
        },
        { activeJob: jobId, cardSelector: CARD_SELECTOR }
    );

    expect(result.activeJob).toBe(jobId);
    expect(result.truncated, `${jobId}: clamped text was truncated`).toEqual([]);
    expect(result.cardOverflows, `${jobId}: card content exceeds 960×508`).toBe(false);
}

test.describe('HUD polish', () => {
    for (const language of LANGUAGES) {
        test(`all dense job cards fit in ${language}`, async ({ page }) => {
            await page.setViewportSize({ width: 1280, height: 800 });
            await openPortfolio(page, ROUTES[language]);

            for (const jobId of DENSE_JOB_IDS) {
                await expectActiveCardFits(page, jobId);
            }
        });
    }

    test('mouseenter wiring still activates the monitor preview', async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await openPortfolio(page);

        const activeJob = await page.evaluate(cardSelector => {
            document
                .querySelector('.company-item[data-job-id="ignitix"]')
                ?.dispatchEvent(new MouseEvent('mouseenter'));
            const card = document.querySelector<HTMLElement>(cardSelector);
            const result = card?.dataset.activeJob;
            document
                .getElementById('work')
                ?.dispatchEvent(new MouseEvent('mouseleave', { bubbles: false }));
            return result;
        }, CARD_SELECTOR);
        expect(activeJob).toBe('ignitix');
    });

    test('monitor card uses the lit palette and primary icon color', async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await openPortfolio(page);

        const palette = await page.evaluate(cardSelector => {
            const card = document.querySelector<HTMLElement>(cardSelector);
            if (!card) throw new Error('Monitor card not found');
            const idleOpacity = getComputedStyle(card).opacity;

            document
                .querySelector('.company-item[data-job-id="ignitix"]')
                ?.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
            const techIcon = card.querySelector<SVGElement>('[data-work-field="techs"] svg');
            if (!techIcon) throw new Error('Active monitor card not found');

            const result = {
                idleOpacity,
                activeOpacity: getComputedStyle(card).opacity,
                background: getComputedStyle(card).backgroundColor,
                foreground: getComputedStyle(card).color,
                techColor: getComputedStyle(techIcon).color,
            };
            document
                .getElementById('work')
                ?.dispatchEvent(new MouseEvent('mouseleave', { bubbles: false }));
            return result;
        }, CARD_SELECTOR);

        expect(palette.idleOpacity).toBe('0');
        expect(palette.activeOpacity).toBe('1');
        expect(palette.background).toBe('rgb(245, 245, 240)');
        expect(palette.foreground).toBe('rgb(17, 24, 39)');
        expect(palette.techColor).not.toBe(palette.foreground);
    });

    test('Work content occupies the reserved right lane on desktop', async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await openPortfolio(page);

        const panel = await page.locator('#work .work-panel').boundingBox();
        expect(panel).not.toBeNull();
        expect(panel!.x).toBeGreaterThan(1280 * 0.65);
        expect(panel!.x + panel!.width).toBeLessThanOrEqual(1280);
    });

    test('Work layout is mirrored: dots on the right, hover grows leftwards', async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await openPortfolio(page);

        const layout = await page.evaluate(() => {
            const wrapper = document.querySelector<HTMLElement>('#work .vertical-line-wrapper');
            const item = document.querySelector<HTMLElement>(
                '#work .company-item[data-job-id="ignitix"]'
            );
            const line = item?.querySelector<HTMLElement>('.line');
            const label = item?.querySelector<HTMLElement>('.text-2xl');
            if (!wrapper || !item || !line || !label) {
                throw new Error('Work layout elements not found');
            }

            return {
                wrapperRight: wrapper.getBoundingClientRect().right,
                itemRight: item.getBoundingClientRect().right,
                lineLeft: line.getBoundingClientRect().left,
                labelRight: label.getBoundingClientRect().right,
            };
        });

        // The dots/vertical line column sits to the right of the company items.
        expect(layout.wrapperRight).toBeGreaterThan(layout.itemRight);
        // The growing line sits on the right side of the label.
        expect(layout.lineLeft).toBeGreaterThanOrEqual(layout.labelRight);
    });

    test('scroll position updates the active section and aria-current (incl. Contact)', async ({
        page,
    }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await openPortfolio(page);

        const home = page.locator('[data-nav="home"]');
        const work = page.locator('[data-nav="work"]');
        const about = page.locator('[data-nav="about"]');
        const contact = page.locator('[data-nav="contact"]');

        await expect(home).toHaveAttribute('aria-current', 'page');

        await page.evaluate(() => {
            window.scrollTo(0, document.getElementById('work')!.offsetTop);
        });
        await expect(work).toHaveAttribute('aria-current', 'page');
        const activeWorkColor = await work
            .locator('svg')
            .evaluate(element => getComputedStyle(element).color);
        expect(activeWorkColor).not.toBe('rgb(226, 232, 240)');

        await page.evaluate(() => {
            window.scrollTo(0, document.getElementById('about')!.offsetTop);
        });
        await expect(about).toHaveAttribute('aria-current', 'page');
        await expect(page.locator('#bottom-nav [aria-current="page"]')).toHaveCount(1);

        // Regression: NAV_SECTION_IDS single-source refactor (scroll.ts) — Contact
        // must scroll+activate exactly like Home/Work/About did before the refactor.
        await page.evaluate(() => {
            window.scrollTo(0, document.getElementById('contact')!.offsetTop);
        });
        await expect(contact).toHaveAttribute('aria-current', 'page');
        await expect(page.locator('#bottom-nav [aria-current="page"]')).toHaveCount(1);
    });

    test('regression: bottom nav fits without overlap at mobile width (4 icons, not 6)', async ({
        page,
    }) => {
        await page.setViewportSize({ width: 390, height: 700 });
        await openPortfolio(page);

        const navButtons = page.locator(
            '[data-nav="home"], [data-nav="work"], [data-nav="about"], [data-nav="contact"]'
        );
        const boxes = await navButtons.evaluateAll(elements =>
            elements.map(element => element.getBoundingClientRect())
        );

        expect(boxes.length).toBe(4);

        for (let i = 1; i < boxes.length; i++) {
            const prev = boxes[i - 1];
            const curr = boxes[i];
            // No horizontal overlap between adjacent nav icon boxes.
            expect(curr.left).toBeGreaterThanOrEqual(prev.right - 1);
        }

        const nav = page.locator('#bottom-nav');
        const navBox = await nav.boundingBox();
        expect(navBox).not.toBeNull();
        expect(navBox!.x).toBeGreaterThanOrEqual(0);
        expect(navBox!.x + navBox!.width).toBeLessThanOrEqual(391);
    });

    for (const width of [1280, 1024]) {
        test(`About uses the wider reading measure at ${width}px`, async ({ page }) => {
            await page.setViewportSize({ width, height: 800 });
            await openPortfolio(page);

            const paragraphs = page.locator('[data-about-copy]');
            const box = await paragraphs.boundingBox();
            expect(box).not.toBeNull();
            expect(box!.width).toBeGreaterThan(600);
            expect(box!.width).toBeLessThanOrEqual(673);
        });
    }

    for (const language of LANGUAGES) {
        test(`About stays inside its container on a narrow viewport in ${language}`, async ({
            page,
        }) => {
            await page.setViewportSize({ width: 390, height: 700 });
            await openPortfolio(page, ROUTES[language]);

            const metrics = await page.locator('[data-about-copy]').evaluate(element => {
                const rect = element.getBoundingClientRect();
                const parentRect = element.parentElement!.getBoundingClientRect();
                return {
                    left: rect.left,
                    right: rect.right,
                    width: rect.width,
                    parentWidth: parentRect.width,
                    contentOverflows: element.scrollWidth > element.clientWidth + 1,
                };
            });

            expect(metrics.left).toBeGreaterThanOrEqual(0);
            expect(metrics.right).toBeLessThanOrEqual(391);
            expect(metrics.width).toBeLessThanOrEqual(metrics.parentWidth + 1);
            expect(metrics.contentOverflows).toBe(false);
        });
    }

    test('language trigger and menu share the dock alignment', async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await openPortfolio(page);

        const workIcon = page.locator('[data-nav="work"] svg');
        const translateIcon = page.locator('[data-nav="translate"] svg');
        const trigger = page.locator('.dropdown-trigger');
        const menu = page.locator('.dropdown-menu');

        const workBox = await workIcon.boundingBox();
        const translateBox = await translateIcon.boundingBox();
        expect(workBox).not.toBeNull();
        expect(translateBox).not.toBeNull();
        expect(Math.abs(workBox!.y - translateBox!.y)).toBeLessThanOrEqual(1);

        await trigger.click();
        await expect(trigger).toHaveAttribute('aria-expanded', 'true');

        const triggerBox = await trigger.boundingBox();
        const menuBox = await menu.boundingBox();
        expect(triggerBox).not.toBeNull();
        expect(menuBox).not.toBeNull();
        const triggerCenter = triggerBox!.x + triggerBox!.width / 2;
        const menuCenter = menuBox!.x + menuBox!.width / 2;
        expect(Math.abs(triggerCenter - menuCenter)).toBeLessThanOrEqual(2);

        await page.locator('body').click({ position: { x: 10, y: 10 } });
        await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });
});
