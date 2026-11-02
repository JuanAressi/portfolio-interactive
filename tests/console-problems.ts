import type { Page } from '@playwright/test';

// Chromium's software compositor reading the canvas back under SwiftShader, not a call from the
// page: it shows up on any WebGL page that stays open long enough, and never on a real GPU.
const SOFTWARE_COMPOSITOR_NOISE = /GL Driver Message .*GPU stall due to ReadPixels/;

/** Collects console errors and warnings plus uncaught errors for as long as the page lives. */
export function collectConsoleProblems(page: Page): string[] {
    const problems: string[] = [];

    page.on('console', message => {
        if (message.type() !== 'error' && message.type() !== 'warning') return;
        if (SOFTWARE_COMPOSITOR_NOISE.test(message.text())) return;
        problems.push(`console.${message.type()}: ${message.text()}`);
    });
    page.on('pageerror', error => {
        problems.push(`pageerror: ${error.message}`);
    });

    return problems;
}
