import { expect, test } from '@playwright/test';
import { collectConsoleProblems } from './console-problems.ts';

const VIEWPORTS = [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
];

for (const viewport of VIEWPORTS) {
    test(`page loads without console errors or warnings at ${viewport.width}×${viewport.height}`, async ({
        page,
    }) => {
        const problems = collectConsoleProblems(page);

        await page.setViewportSize(viewport);
        await page.goto('./');
        // The scene loads after the first paint and its models after that; networkidle covers
        // their progress and error paths.
        await expect(page.locator('#canvas-container canvas')).toHaveClass(/is-rendered/);
        await page.waitForLoadState('networkidle');

        expect(problems).toEqual([]);
    });
}
