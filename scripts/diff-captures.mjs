// Compares two folders of `npm run scene:capture`: per image, how many pixels differ and by how
// much, plus a side-by-side (A | B | difference ×8) of each pair that differs.
// Usage: npm run scene:diff -- <dirA> <dirB> [--out <dir>] [--threshold 8]
import { mkdir, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import sharp from 'sharp';

function option(name, fallback) {
    const index = process.argv.indexOf(`--${name}`);
    return index === -1 ? fallback : process.argv[index + 1];
}

const positional = [];
for (let index = 2; index < process.argv.length; index++) {
    if (process.argv[index].startsWith('--')) index++;
    else positional.push(process.argv[index]);
}
const [dirA, dirB] = positional;
if (!dirA || !dirB) throw new Error('Usage: scene:diff <dirA> <dirB> [--out <dir>] [--threshold 8]');

const threshold = Number(option('threshold', 8));
const outDir = option('out', null) && resolve(option('out'));
if (outDir) await mkdir(outDir, { recursive: true });

async function raw(path) {
    const { data, info } = await sharp(path).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    return { data, ...info };
}

const files = (await readdir(dirA)).filter(file => file.endsWith('.png')).sort();
const rows = [];

for (const file of files) {
    const a = await raw(join(dirA, file));
    const b = await raw(join(dirB, file));
    if (a.width !== b.width || a.height !== b.height) {
        rows.push({ file, error: 'sizes differ' });
        continue;
    }

    const diff = Buffer.alloc(a.data.length);
    let over = 0;
    let max = 0;
    for (let pixel = 0; pixel < a.width * a.height; pixel++) {
        let worst = 0;
        for (let channel = 0; channel < 3; channel++) {
            const at = pixel * 3 + channel;
            worst = Math.max(worst, Math.abs(a.data[at] - b.data[at]));
            diff[at] = Math.min(255, Math.abs(a.data[at] - b.data[at]) * 8);
        }
        if (worst > threshold) over++;
        max = Math.max(max, worst);
    }
    rows.push({ file, over, percent: (over / (a.width * a.height)) * 100, max });

    if (outDir && max > 0) {
        const { width, height } = a;
        await sharp({ create: { width: width * 3, height, channels: 3, background: '#000' } })
            .composite([
                { input: join(dirA, file), left: 0, top: 0 },
                { input: join(dirB, file), left: width, top: 0 },
                { input: diff, raw: { width, height, channels: 3 }, left: width * 2, top: 0 },
            ])
            .png()
            .toFile(join(outDir, `diff-${file}`));
    }
}

console.log(`threshold: ${threshold} levels out of 255`);
for (const row of rows) {
    console.log(
        row.error
            ? `${row.file}: ${row.error}`
            : `${row.file}: ${row.over} px over threshold (${row.percent.toFixed(3)}%), max ${row.max}`
    );
}
