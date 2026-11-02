import { expect, test } from '@playwright/test';

const VIEWPORTS = [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
];

for (const viewport of VIEWPORTS) {
    test(`page loads without console errors at ${viewport.width}×${viewport.height}`, async ({
        page,
    }) => {
        // Warnings (KHR_materials_pbrSpecularGlossiness, tracked in T3) are not collected.
        const errors: string[] = [];
        page.on('console', message => {
            if (message.type() === 'error') errors.push(`console.error: ${message.text()}`);
        });
        page.on('pageerror', error => {
            errors.push(`pageerror: ${error.message}`);
        });

        await page.setViewportSize(viewport);
        // Models arrive after the load event; networkidle covers their progress and error paths.
        await page.goto('./', { waitUntil: 'networkidle' });

        expect(errors).toEqual([]);
    });
}
