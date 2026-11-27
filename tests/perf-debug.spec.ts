import { expect, test } from '@playwright/test';

const CANVAS = '#canvas-container canvas.is-rendered';

interface PerfApi {
    snapshot(): { frame: { calls: number; triangles: number }; meshes: number };
    inventory(progressSamples?: number): { meshes: Array<{ origin: string }> };
}

test('a normal visit loads no diagnostics and exposes nothing', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', request => requests.push(request.url()));

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('./');
    await page.locator(CANVAS).waitFor({ state: 'attached' });

    expect(await page.evaluate(() => '__perf' in window)).toBe(false);
    expect(requests.filter(url => url.includes('perf-debug'))).toEqual([]);
});

test('?debug=perf exposes what the renderer drew and the scene inventory', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('./?debug=perf');
    await page.locator(CANVAS).waitFor({ state: 'attached' });
    await page.waitForFunction(() => '__perf' in window);

    // The wrapper reads the counters after each render, so wait for one that follows it.
    await expect
        .poll(() =>
            page.evaluate(() => (window as unknown as { __perf: PerfApi }).__perf.snapshot().frame.calls)
        )
        .toBeGreaterThan(0);

    // Few camera positions: a software-rendered page shares its thread with the drawing.
    const inventory = await page.evaluate(() =>
        (window as unknown as { __perf: PerfApi }).__perf.inventory(3)
    );
    const origins = new Set(inventory.meshes.map(mesh => mesh.origin));

    expect([...origins]).toEqual(expect.arrayContaining(['room.ts', 'desk.js', 'monitor.js']));
});
