import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
const baseURL = `http://127.0.0.1:${PORT}/portfolio-interactive/`;

export default defineConfig({
    testDir: './tests',
    timeout: 60_000,
    fullyParallel: false,
    forbidOnly: Boolean(process.env.CI),
    retries: process.env.CI ? 1 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: process.env.CI ? 'line' : 'list',
    use: {
        baseURL,
        reducedMotion: 'reduce',
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    webServer: {
        command: `npm run preview -- --host 127.0.0.1 --port ${PORT} --ignore-lock`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 30_000,
    },
});
