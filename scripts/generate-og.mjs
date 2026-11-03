// Screenshots the internal /og/<locale>/ pages into public/og-<locale>.png.
import { dev } from 'astro';
import { chromium } from '@playwright/test';
import sharp from 'sharp';

const SIZE = { width: 1200, height: 630 };
// The scene has no antialiasing: capturing at 2x and scaling down takes the moiré off the wall.
const SUPERSAMPLING = 2;
const LOCALES = ['es', 'en'];
const PORT = 4399;
const STABLE_POLL_MS = 1500;
const STABLE_TIMEOUT_MS = 180_000;

// The scene adds models as they arrive and software WebGL is slow, so there is no one moment that
// says it's done: the picture is complete when two captures in a row are the same.
async function captureWhenStable(page) {
    const deadline = Date.now() + STABLE_TIMEOUT_MS;
    let previous = await page.screenshot();

    while (Date.now() < deadline) {
        await page.waitForTimeout(STABLE_POLL_MS);
        const current = await page.screenshot();
        if (current.equals(previous)) return current;
        previous = current;
    }
    throw new Error(`${page.url()} never settled`);
}

const server = await dev({ base: '/', server: { port: PORT }, logLevel: 'warn' });
const browser = await chromium.launch();

try {
    for (const locale of LOCALES) {
        const page = await browser.newPage({ viewport: SIZE, deviceScaleFactor: SUPERSAMPLING });
        await page.goto(`http://localhost:${server.address.port}/og/${locale}/`);
        await page.locator('#canvas-container canvas.is-rendered').waitFor({ state: 'attached' });
        await page.waitForLoadState('networkidle');
        await page.evaluate(() => document.fonts.ready);

        const screenshot = await captureWhenStable(page);
        const file = new URL(`../public/og-${locale}.png`, import.meta.url);
        await sharp(screenshot)
            .resize(SIZE.width, SIZE.height)
            .removeAlpha()
            .png({ compressionLevel: 9 })
            .toFile(file.pathname);
        await page.close();
    }
} finally {
    await browser.close();
    await server.stop();
}
