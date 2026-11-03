// @vitest-environment node
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import {
    WEBP_MAX_DIMENSION,
    encodeWebpUnder,
    nextScrollTop,
    stitch,
    stitchPlan,
} from './captures-lib.mjs';

// A page with a different color on every row, so any misplaced band shows up in the comparison.
async function fakePage(width, height) {
    const pixels = Buffer.alloc(width * height * 3);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 3;
            pixels[i] = y % 256;
            pixels[i + 1] = Math.floor(y / 256) % 256;
            pixels[i + 2] = x % 256;
        }
    }
    return sharp(pixels, { raw: { width, height, channels: 3 } }).png().toBuffer();
}

const viewportOf = (page, width, top, height) =>
    sharp(page).extract({ left: 0, top, width, height }).png().toBuffer();

const rawPixels = image => sharp(image).removeAlpha().raw().toBuffer();

describe('nextScrollTop', () => {
    it('moves one step down', () => {
        expect(nextScrollTop(0, 720, 5000)).toBe(720);
    });

    it('stops at the bottom of the page', () => {
        expect(nextScrollTop(4500, 720, 4800)).toBe(4800);
    });

    it('stays at the top when the page fits in the viewport', () => {
        expect(nextScrollTop(0, 720, -100)).toBe(0);
    });
});

describe('stitchPlan', () => {
    it('cuts in the middle of each overlap and covers the page once', () => {
        const plan = stitchPlan([0, 720, 1440, 1500], 900);

        expect(plan).toEqual([
            { from: 0, to: 810 },
            { from: 90, to: 810 },
            { from: 90, to: 480 },
            { from: 420, to: 900 },
        ]);
        const height = plan.reduce((sum, { from, to }) => sum + to - from, 0);
        expect(height).toBe(1500 + 900);
    });

    it('moves the cut below a sticky header taller than half the overlap', () => {
        const insets = [{ top: 0 }, { top: 125 }, { top: 125 }];

        const plan = stitchPlan([0, 720, 1440], 900, insets);

        expect(plan).toEqual([
            { from: 0, to: 845 },
            { from: 125, to: 845 },
            { from: 125, to: 900 },
        ]);
    });

    it('moves the cut above a bar stuck to the bottom', () => {
        const plan = stitchPlan([0, 720], 900, [{ bottom: 150 }, {}]);

        expect(plan).toEqual([
            { from: 0, to: 750 },
            { from: 30, to: 900 },
        ]);
    });

    it('hides the header first when both bars do not fit in the overlap', () => {
        const plan = stitchPlan([0, 720], 900, [{ bottom: 150 }, { top: 125 }]);

        expect(plan).toEqual([
            { from: 0, to: 845 },
            { from: 125, to: 900 },
        ]);
    });

    it('takes the whole viewport when there is a single frame', () => {
        expect(stitchPlan([0], 900)).toEqual([{ from: 0, to: 900 }]);
    });
});

describe('stitch', () => {
    it.each([1, 2])('rebuilds the page from overlapping viewports at scale %i', async scale => {
        const width = 40;
        const viewportHeight = 100;
        const pageHeight = 430;
        const page = await fakePage(width * scale, pageHeight * scale);
        const tops = [0, 80, 160, 240, 320, 330];
        const frames = await Promise.all(
            tops.map(top => viewportOf(page, width * scale, top * scale, viewportHeight * scale))
        );

        const insets = tops.map(() => ({ top: 30, bottom: 5 }));

        const long = await stitch(frames, tops, viewportHeight, scale, insets);

        expect(await sharp(long).metadata()).toMatchObject({
            width: width * scale,
            height: pageHeight * scale,
        });
        expect((await rawPixels(long)).equals(await rawPixels(page))).toBe(true);
    });
});

describe('encodeWebpUnder', () => {
    it('keeps the size when the image already fits', async () => {
        const image = await fakePage(200, 200);

        const { buffer, scale } = await encodeWebpUnder(image, 300 * 1024);

        expect(scale).toBe(1);
        expect(buffer.length).toBeLessThan(300 * 1024);
        expect(await sharp(buffer).metadata()).toMatchObject({ format: 'webp', width: 200 });
    });

    it('scales down until the file fits under the limit', async () => {
        const noise = await sharp({
            create: { width: 300, height: 300, channels: 3, noise: { type: 'gaussian', mean: 128, sigma: 60 } },
        })
            .png()
            .toBuffer();

        const { buffer, scale } = await encodeWebpUnder(noise, 20 * 1024);

        expect(buffer.length).toBeLessThan(20 * 1024);
        expect(scale).toBeLessThan(1);
    });

    it('fits images taller than WebP allows', async () => {
        const tall = await sharp({
            create: { width: 10, height: WEBP_MAX_DIMENSION + 1000, channels: 3, background: '#123' },
        })
            .png()
            .toBuffer();

        const { buffer } = await encodeWebpUnder(tall, 300 * 1024);

        const { height } = await sharp(buffer).metadata();
        expect(height).toBeLessThanOrEqual(WEBP_MAX_DIMENSION);
    });
});
