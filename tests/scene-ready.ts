import { expect, type Page } from '@playwright/test';

/**
 * Resolves once the scene has drawn its first frame (`is-rendered`, see scene.js). The scene
 * starts after the first paint and an idle callback, so how long that takes depends on the load of
 * the machine: the wait has no limit of its own and only the test's timeout bounds it. A scene that
 * never starts still fails the test, but as a test timeout rather than as a flake of a slow run.
 */
export async function waitForSceneRendered(page: Page): Promise<void> {
    await expect(page.locator('#canvas-container canvas')).toHaveClass(/is-rendered/, {
        timeout: 0,
    });
}
