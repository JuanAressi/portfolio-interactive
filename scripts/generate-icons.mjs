// Builds favicon.ico and apple-touch-icon.png from public/favicon.svg.
import { readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const PUBLIC_DIR = new URL('../public/', import.meta.url);
const ICO_SIZE = 32;
const TOUCH_SIZE = 180;
const TOUCH_CUBE_SIZE = 132;
const TOUCH_BACKGROUND = '#070b10';

// An ICO is a small directory followed by the images; a PNG is a valid image inside it.
function toIco(png, size) {
    const header = Buffer.alloc(22);
    header.writeUInt16LE(1, 2); // Type: icon.
    header.writeUInt16LE(1, 4); // Number of images.
    header.writeUInt8(size, 6);
    header.writeUInt8(size, 7);
    header.writeUInt16LE(1, 10); // Color planes.
    header.writeUInt16LE(32, 12); // Bits per pixel.
    header.writeUInt32LE(png.length, 14);
    header.writeUInt32LE(header.length, 18); // Offset of the image.
    return Buffer.concat([header, png]);
}

const svg = await readFile(new URL('favicon.svg', PUBLIC_DIR));
// High density so the small sizes come from a sharp raster, not from an upscaled one.
const render = size => sharp(svg, { density: 1200 }).resize(size, size);

const icoPng = await render(ICO_SIZE).png().toBuffer();
await writeFile(new URL('favicon.ico', PUBLIC_DIR), toIco(icoPng, ICO_SIZE));

// iOS fills transparency with black and rounds the corners itself, so it needs its own background
// and some margin.
const margin = (TOUCH_SIZE - TOUCH_CUBE_SIZE) / 2;
await render(TOUCH_CUBE_SIZE)
    .extend({
        top: margin,
        bottom: margin,
        left: margin,
        right: margin,
        background: TOUCH_BACKGROUND,
    })
    .flatten({ background: TOUCH_BACKGROUND })
    .png()
    .toFile(new URL('apple-touch-icon.png', PUBLIC_DIR).pathname);
