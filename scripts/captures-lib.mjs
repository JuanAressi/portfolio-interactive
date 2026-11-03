// Pure helpers for generate-captures.mjs: where to scroll, how to stitch and how to fit a WebP
// under the size budget. Kept apart from Playwright so they can be unit tested.
import sharp from 'sharp';

// WebP stores width and height in 14 bits.
export const WEBP_MAX_DIMENSION = 16383;

// Next scroll position: one step down, never past the bottom of the page.
export function nextScrollTop(current, step, maxScroll) {
    return Math.min(current + step, Math.max(0, maxScroll));
}

// Which rows of each frame go into the long image, in CSS pixels. Consecutive frames overlap, and
// the cut sits in the middle of the overlap, so small fixed elements (a language switcher, a chat
// button) show up once instead of on every seam. Bars stuck to an edge can be taller than half the
// overlap: `insets[i]` gives the height of what covers the top and bottom of frame i, and the cut
// moves past them when the overlap allows it. The first frame starts at its top and the last one
// ends at its bottom.
export function stitchPlan(scrollTops, viewportHeight, insets = []) {
    const inset = i => ({ top: 0, bottom: 0, ...insets[i] });
    const cuts = scrollTops.map((top, i) => {
        if (i === 0) return 0;
        const overlapEnd = scrollTops[i - 1] + viewportHeight;
        const middle = Math.round((top + overlapEnd) / 2);
        const low = top + inset(i).top;
        const high = overlapEnd - inset(i - 1).bottom;
        if (low <= high) return Math.min(Math.max(middle, low), high);
        // The bars don't fit together in the overlap: hide the top one, which is the usual
        // sticky header, as far as the previous frame reaches.
        return Math.min(low, overlapEnd);
    });

    return scrollTops.map((top, i) => {
        const from = cuts[i] - top;
        const to = i === scrollTops.length - 1 ? viewportHeight : cuts[i + 1] - top;
        return { from, to };
    });
}

// Stitches PNG frames into one image following stitchPlan. `scale` is the device pixel ratio.
export async function stitch(frames, scrollTops, viewportHeight, scale, insets = []) {
    const plan = stitchPlan(scrollTops, viewportHeight, insets);
    const { width } = await sharp(frames[0]).metadata();
    const bands = [];
    let height = 0;

    for (const [i, { from, to }] of plan.entries()) {
        const top = Math.round(from * scale);
        const bandHeight = Math.round(to * scale) - top;
        if (bandHeight <= 0) continue;
        const input = await sharp(frames[i])
            .extract({ left: 0, top, width, height: bandHeight })
            .png()
            .toBuffer();
        bands.push({ input, left: 0, top: height });
        height += bandHeight;
    }

    return sharp({ create: { width, height, channels: 3, background: '#000' } })
        .composite(bands)
        .png()
        .toBuffer();
}

const QUALITIES = [82, 72, 62];
const SCALE_STEP = 0.85;
const MIN_SCALE = 0.1;

// Encodes to WebP under maxBytes: first lowers the quality, then the size. Returns the buffer and
// the scale it ended up at.
export async function encodeWebpUnder(input, maxBytes) {
    const { width, height } = await sharp(input, { limitInputPixels: false }).metadata();
    let scale = Math.min(1, WEBP_MAX_DIMENSION / width, WEBP_MAX_DIMENSION / height);

    while (scale >= MIN_SCALE) {
        const resized = sharp(input, { limitInputPixels: false }).resize(
            Math.round(width * scale),
            Math.round(height * scale)
        );
        for (const quality of QUALITIES) {
            const buffer = await resized.clone().webp({ quality, effort: 6 }).toBuffer();
            if (buffer.length < maxBytes) return { buffer, scale, quality };
        }
        scale *= SCALE_STEP;
    }
    throw new Error(`Could not fit a ${width}x${height} image under ${maxBytes} bytes`);
}
