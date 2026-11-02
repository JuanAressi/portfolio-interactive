import { expect, test, type Page, type Route } from '@playwright/test';

const MODELS = ['keyboard', 'mouse', 'books', 'rounded_chair', 'door_handle'];
const IDLE_WINDOW_MS = 500;

// Keeps the WebGL calls but not their cost (a software frame takes seconds), and exposes how many
// draw calls the last rendered frame made. Each loaded mesh adds calls to that frame.
async function countDrawCalls(page: Page): Promise<void> {
    await page.addInitScript(() => {
        const stats = { frame: 0, lastFrame: 0, total: 0 };
        Object.assign(window, { drawStats: stats });

        const countCall = () => {
            stats.frame += 1;
            stats.total += 1;
        };
        for (const context of [WebGLRenderingContext, WebGL2RenderingContext]) {
            context.prototype.drawArrays = countCall;
            context.prototype.drawElements = countCall;
        }

        const closeFrame = () => {
            if (stats.frame > 0) stats.lastFrame = stats.frame;
            stats.frame = 0;
            requestAnimationFrame(closeFrame);
        };
        requestAnimationFrame(closeFrame);
    });
}

type DrawStats = { lastFrame: number; total: number };

function readDrawStats(page: Page): Promise<DrawStats> {
    return page.evaluate(() => {
        const { lastFrame, total } = (window as unknown as { drawStats: DrawStats }).drawStats;
        return { lastFrame, total };
    });
}

async function waitForIdleLoop(page: Page): Promise<DrawStats> {
    let previous = await readDrawStats(page);
    await expect(async () => {
        await page.waitForTimeout(IDLE_WINDOW_MS);
        const current = await readDrawStats(page);
        const isIdle = current.total === previous.total && current.total > 0;
        previous = current;
        expect(isIdle).toBe(true);
    }).toPass();
    return previous;
}

test('a model that loads while the loop is idle ends up rendered without any input', async ({
    page,
}) => {
    const heldRoutes = new Map<string, Route>();
    await page.route('**/*.glb', route => {
        const model = MODELS.find(name => route.request().url().includes(`/${name}.`));
        if (!model) throw new Error(`Unexpected model: ${route.request().url()}`);
        heldRoutes.set(model, route);
    });

    await countDrawCalls(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('./');
    await expect.poll(() => heldRoutes.size).toBe(MODELS.length);

    let idle = await waitForIdleLoop(page);

    for (const model of MODELS) {
        await heldRoutes.get(model)!.continue();

        await expect
            .poll(async () => (await readDrawStats(page)).lastFrame, `${model} was not drawn`)
            .toBeGreaterThan(idle.lastFrame);

        idle = await waitForIdleLoop(page);
    }
});
