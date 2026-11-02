import { expect, test } from '@playwright/test';

const VIEWPORTS = [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
];

for (const viewport of VIEWPORTS) {
    test(`page loads without console errors or warnings at ${viewport.width}×${viewport.height}`, async ({
        page,
    }) => {
        const errors: string[] = [];
        page.on('console', message => {
            if (message.type() === 'error' || message.type() === 'warning') {
                errors.push(`console.${message.type()}: ${message.text()}`);
            }
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
