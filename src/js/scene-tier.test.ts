import { afterEach, describe, expect, it, vi } from 'vitest';
import { getSceneTier } from './scene-tier.ts';

function setViewport(innerWidth: number, innerHeight: number, devicePixelRatio = 1): void {
    vi.stubGlobal('innerWidth', innerWidth);
    vi.stubGlobal('innerHeight', innerHeight);
    vi.stubGlobal('devicePixelRatio', devicePixelRatio);
}

describe('getSceneTier', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it.each([
        ['narrow', 767, 900],
        ['short', 1280, 599],
    ])('uses the light scene on a %s viewport', (_name, width, height) => {
        setViewport(width, height, 3);

        expect(getSceneTier()).toEqual({ pixelRatio: 1, shadows: false, chair: false });
    });

    it.each([
        [768, 600, 1, 1],
        [1440, 900, 2, 1.5],
    ])('uses the full scene at %i×%i', (width, height, devicePixelRatio, pixelRatio) => {
        setViewport(width, height, devicePixelRatio);

        expect(getSceneTier()).toEqual({ pixelRatio, shadows: true, chair: true });
    });
});
