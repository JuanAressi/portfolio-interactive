// Captures the client projects shown in the portfolio into assets-src/projects/<slug>/<viewport>/:
// the hero, one frame per scroll step and a long image stitched from the frames, all as WebP.
// It scrolls step by step instead of using fullPage, so scroll-triggered reveals run and pinned
// sections show what a visitor sees. Usage: npm run captures:generate [-- <slug> ...]
import { mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { chromium, devices } from '@playwright/test';
import sharp from 'sharp';
import { encodeWebpUnder, nextScrollTop, stitch } from './captures-lib.mjs';

const PROJECTS = [
    { slug: 'sofigior', name: 'SofiGior', url: 'https://sofigior.com/' },
    {
        slug: 'voryn',
        name: 'Voryn',
        url: 'https://voryn.com.ar/',
        dismiss: ['.js-acknowledge-cookies-private'],
    },
];

const VIEWPORTS = [
    { name: 'desktop', viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
    {
        name: 'mobile',
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
        userAgent: devices['Pixel 7'].userAgent,
    },
];

const OUTPUT_DIR = new URL('../assets-src/projects/', import.meta.url);
// 300 KB in decimal units, so no tool reports a file over the limit.
const MAX_BYTES = 300_000;
const STEP_RATIO = 0.8;
const MAX_FRAMES = 60;
// The page's JS runs on a fake clock that only moves when the script says so (see captureProject).
// Times below marked "page time" advance that clock; the rest are real time.
const CLOCK_START = new Date('2026-01-01T12:00:00-03:00');
const SCROLL_INCREMENTS = 12;
const SCROLL_DURATION_MS = 720; // page time
// Page time given to timers and requestAnimationFrame after each scroll, before and after the
// images it triggered load: reveals with staggers, lazy loaders, parallax.
const STEP_PAGE_TIME_MS = 1200;
// Real time for IntersectionObserver callbacks, which are not timers, to run after a scroll.
const OBSERVER_DELAY_MS = 250;
const OBSERVER_FRAME_MS = 50;
const NETWORK_QUIET_MS = 500;
const NETWORK_TIMEOUT_MS = 8000;
const ANIMATIONS_TIMEOUT_MS = 6000;
// Second of a playing video that the capture shows.
const VIDEO_FRAME_S = 1;
const STABLE_POLL_MS = 400;
const STABLE_TIMEOUT_MS = 8000;

// Common texts of cookie banners and newsletter popups, matched on the whole label.
const DISMISS_TEXT =
    /^(aceptar|acepto|aceptar todo|entendido|ok|cerrar|no,? gracias|accept|accept all|got it|close|no,? thanks|×|✕)$/i;

const log = (...args) => console.log('[captures]', ...args);

// Clicks the close/accept button of whatever overlay is open: the project's own selectors first,
// then any visible button with a dismiss label inside a fixed element or an open dialog.
async function dismissOverlays(page, selectors = []) {
    for (const selector of selectors) {
        const button = page.locator(selector).first();
        if (await button.isVisible().catch(() => false)) {
            await button.evaluate(element => element.click());
            log(`dismissed ${selector}`);
        }
    }
    const clicked = await page.evaluate(pattern => {
        const regex = new RegExp(pattern.source, pattern.flags);
        const isOverlay = element => {
            for (let node = element; node && node !== document.body; node = node.parentElement) {
                if (node.matches('dialog[open], [role="dialog"], [aria-modal="true"]')) return true;
                if (getComputedStyle(node).position === 'fixed') return true;
            }
            return false;
        };
        const labels = [];
        for (const button of document.querySelectorAll('button, a, [role="button"]')) {
            const label = (button.getAttribute('aria-label') || button.textContent || '').trim();
            const box = button.getBoundingClientRect();
            if (!regex.test(label) || box.width === 0 || box.height === 0) continue;
            if (getComputedStyle(button).visibility === 'hidden' || !isOverlay(button)) continue;
            button.click();
            labels.push(label);
        }
        return labels;
    }, { source: DISMISS_TEXT.source, flags: DISMISS_TEXT.flags });
    if (clicked.length) log(`dismissed ${clicked.join(', ')}`);
}

// Counts requests in flight, so each step can wait for the lazy images it triggered.
function trackNetwork(page) {
    let inFlight = 0;
    let lastChange = Date.now();
    const change = delta => {
        inFlight = Math.max(0, inFlight + delta);
        lastChange = Date.now();
    };
    page.on('request', () => change(1));
    page.on('requestfinished', () => change(-1));
    page.on('requestfailed', () => change(-1));

    return async function waitForQuiet() {
        const deadline = Date.now() + NETWORK_TIMEOUT_MS;
        while (Date.now() < deadline) {
            if (inFlight === 0 && Date.now() - lastChange >= NETWORK_QUIET_MS) return;
            await page.waitForTimeout(100);
        }
    };
}

// Scrolls in small eased increments, letting page time pass between them, so scroll handlers and
// scrubbed animations see a scroll and not a jump.
async function smoothScrollTo(page, top) {
    const start = await page.evaluate(() => window.scrollY);
    for (let i = 1; i <= SCROLL_INCREMENTS; i++) {
        const t = i / SCROLL_INCREMENTS;
        const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
        const y = Math.round(start + (top - start) * eased);
        await page.evaluate(y => window.scrollTo({ top: y, behavior: 'instant' }), y);
        // IntersectionObserver callbacks run on real rendering frames, not on the page clock. Let
        // them fire before page time moves, so loops they start (the auto-scrolling strips) start
        // at the same page time on every run.
        await page.waitForTimeout(OBSERVER_FRAME_MS);
        await page.clock.runFor(SCROLL_DURATION_MS / SCROLL_INCREMENTS);
    }
    return page.evaluate(() => window.scrollY);
}

// Waits for the images in the viewport and for the finite CSS animations and transitions that are
// running; those run on real time, not on the page clock. Infinite ones (marquees, glows, spinning
// discs) and autoplaying carousels are stopped at their start, so two runs give the same picture.
async function settle(page) {
    // The timeout lives here: a setTimeout inside the page would wait for the paused clock.
    const done = page.evaluate(async () => {
        const inView = element => {
            const box = element.getBoundingClientRect();
            return box.width > 0 && box.bottom > 0 && box.top < window.innerHeight;
        };
        const images = [...document.images].filter(image => inView(image) && !image.complete);
        const loaded = images.map(
            image =>
                new Promise(resolve => {
                    image.addEventListener('load', resolve, { once: true });
                    image.addEventListener('error', resolve, { once: true });
                })
        );
        const finite = document
            .getAnimations()
            .filter(a => a.playState === 'running' && a.effect?.getTiming().iterations !== Infinity)
            .map(a => a.finished.catch(() => {}));
        await Promise.all([document.fonts.ready, ...loaded, ...finite]);
    });
    await Promise.race([done.catch(() => {}), page.waitForTimeout(ANIMATIONS_TIMEOUT_MS)]);

    const frozen = page.evaluate(async videoFrame => {
        for (const animation of document.getAnimations()) {
            const timing = animation.effect?.getTiming();
            if (timing?.iterations !== Infinity || animation.playState !== 'running') continue;
            animation.pause();
            animation.currentTime = 0;
        }
        for (const element of document.querySelectorAll('.swiper, .swiper-container')) {
            const swiper = element.swiper;
            if (!swiper || swiper.destroyed) continue;
            swiper.autoplay?.stop();
            if (swiper.params.loop) swiper.slideToLoop(0, 0);
            else swiper.slideTo(0, 0);
        }
        // Videos that play on their own (in view, or the active card on touch screens) stop on
        // the same frame every time.
        const playing = [...document.querySelectorAll('video')].filter(video => !video.paused);
        await Promise.all(
            playing.map(video => {
                video.pause();
                const seeked = new Promise(resolve =>
                    video.addEventListener('seeked', resolve, { once: true })
                );
                video.currentTime = Math.min(videoFrame, (video.duration || 0) / 2);
                return seeked;
            })
        );
    }, VIDEO_FRAME_S);
    await Promise.race([frozen.catch(() => {}), page.waitForTimeout(ANIMATIONS_TIMEOUT_MS)]);
}

// Height of the bars stuck to the top and bottom of the viewport (a sticky header, a cookie bar):
// fixed or stuck sticky elements at least half the viewport wide, touching that edge.
function measureInsets(page) {
    return page.evaluate(() => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const insets = { top: 0, bottom: 0 };
        for (const element of document.querySelectorAll('body *')) {
            const { position, visibility, opacity } = getComputedStyle(element);
            if (position !== 'fixed' && position !== 'sticky') continue;
            if (visibility === 'hidden' || Number(opacity) === 0) continue;
            const box = element.getBoundingClientRect();
            if (box.width < width / 2 || box.height === 0) continue;
            if (box.top <= 1 && box.bottom > 0 && box.bottom < height * 0.4) {
                insets.top = Math.max(insets.top, Math.ceil(box.bottom));
            } else if (box.bottom >= height - 1 && box.top < height && box.top > height * 0.6) {
                insets.bottom = Math.max(insets.bottom, Math.ceil(height - box.top));
            }
        }
        return insets;
    });
}

// The long image is a design overview, stitched from a second capture of each step where
// - floating widgets (chat buttons, language switchers: small fixed or sticky elements) are
//   hidden, so they don't repeat or get sliced at every seam;
// - sticky columns (sticky elements shorter than the viewport, not bars) sit where the flow puts
//   them, so they don't show up once per band.
// Bars stuck to an edge go through measureInsets, and full-height fixed or sticky stages are
// content and stay. Returns null when there is nothing to change.
async function captureForStitch(page) {
    const changed = await page.evaluate(() => {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const save = element => {
            element.dataset.captureStyle = element.getAttribute('style') ?? '';
            element.style.setProperty('transition', 'none', 'important');
        };
        let count = 0;
        for (const element of document.querySelectorAll('body *')) {
            const { position } = getComputedStyle(element);
            if (position !== 'fixed' && position !== 'sticky') continue;
            if (element.closest('[data-capture-style]')) continue;
            const box = element.getBoundingClientRect();
            if (box.width === 0 || box.height === 0) continue;
            if (box.bottom <= 0 || box.top >= viewportHeight) continue;
            const isBar = box.width >= viewportWidth / 2 && box.height < viewportHeight * 0.4;
            const isWidget =
                box.width < viewportWidth / 2 &&
                box.width * box.height <= viewportWidth * viewportHeight * 0.1;
            if (isWidget) {
                // Opacity, not visibility: children can declare visibility: visible.
                save(element);
                element.style.setProperty('opacity', '0', 'important');
                count++;
            } else if (position === 'sticky' && !isBar && box.height < viewportHeight * 0.8) {
                // Relative keeps the same box in the flow; with no offsets it sits unstuck.
                save(element);
                element.style.setProperty('position', 'relative', 'important');
                for (const side of ['top', 'right', 'bottom', 'left']) {
                    element.style.setProperty(side, 'auto', 'important');
                }
                count++;
            }
        }
        return count;
    });
    if (!changed) return null;
    const screenshot = await page.screenshot();
    await page.evaluate(() => {
        for (const element of document.querySelectorAll('[data-capture-style]')) {
            element.setAttribute('style', element.dataset.captureStyle);
            delete element.dataset.captureStyle;
        }
    });
    return screenshot;
}

// Same idea as generate-og.mjs: the frame is done when two captures in a row are equal.
async function captureWhenStable(page, label) {
    const deadline = Date.now() + STABLE_TIMEOUT_MS;
    let previous = await page.screenshot();

    while (Date.now() < deadline) {
        await page.waitForTimeout(STABLE_POLL_MS);
        const current = await page.screenshot();
        if (current.equals(previous)) return current;
        previous = current;
    }
    log(`warning: ${label} never settled, keeping the last capture`);
    return previous;
}

async function writeWebp(png, file) {
    const { buffer, scale, quality } = await encodeWebpUnder(png, MAX_BYTES);
    await writeFile(file, buffer);
    if (scale < 1) {
        const name = file.pathname.split('/').slice(-3).join('/');
        log(`${name}: scaled to ${Math.round(scale * 100)}% (q${quality}) to stay under the limit`);
    }
}

async function captureProject(browser, project, preset) {
    const { name: viewportName, ...contextOptions } = preset;
    const context = await browser.newContext({
        ...contextOptions,
        locale: 'es-AR',
        timezoneId: 'America/Argentina/Buenos_Aires',
        reducedMotion: 'no-preference',
    });
    // JS timers, requestAnimationFrame, Date and performance.now only move when the script advances
    // them, the same amount on every run. Without it the hero canvas, the rotating words and the
    // auto-scrolling strips land somewhere different each time. Math.random gets a fixed seed for
    // the same reason (typing effects with random delays).
    await context.clock.install({ time: CLOCK_START });
    await context.clock.pauseAt(CLOCK_START);
    await context.addInitScript(() => {
        let seed = 0x2f6b9a1d;
        Math.random = () => {
            seed = (seed + 0x6d2b79f5) | 0;
            let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    });
    const page = await context.newPage();
    const waitForQuiet = trackNetwork(page);
    const viewportHeight = preset.viewport.height;
    const step = Math.round(viewportHeight * STEP_RATIO);
    const label = `${project.slug}/${viewportName}`;

    log(`${label}: loading ${project.url}`);
    await page.goto(project.url, { waitUntil: 'networkidle' });
    // Masked videos come out with transparent pixels in headless Chromium; a browser shows the
    // page background there.
    const background = await page.evaluate(() => {
        const color = element => getComputedStyle(element).backgroundColor;
        const opaque = value => value && value !== 'transparent' && !/rgba\(.*,\s*0\)$/.test(value);
        return [color(document.body), color(document.documentElement)].find(opaque) ?? '#fff';
    });

    const frames = [];
    const stitchFrames = [];
    const scrollTops = [];
    const insets = [];
    let top = await page.evaluate(() => window.scrollY);

    while (frames.length < MAX_FRAMES) {
        await page.waitForTimeout(OBSERVER_DELAY_MS);
        await page.clock.runFor(STEP_PAGE_TIME_MS);
        await waitForQuiet();
        await dismissOverlays(page, project.dismiss);
        await page.clock.runFor(STEP_PAGE_TIME_MS);
        await settle(page);
        const frame = await captureWhenStable(page, `${label} frame ${frames.length}`);
        const flatten = png => sharp(png).flatten({ background }).png().toBuffer();
        frames.push(await flatten(frame));
        const clean = await captureForStitch(page);
        stitchFrames.push(clean ? await flatten(clean) : frames.at(-1));
        scrollTops.push(top);
        insets.push(await measureInsets(page));

        const maxScroll = await page.evaluate(
            () => document.scrollingElement.scrollHeight - window.innerHeight
        );
        const target = nextScrollTop(top, step, maxScroll);
        if (target <= top) break;
        const reached = await smoothScrollTo(page, target);
        if (reached <= top) break;
        top = reached;
    }
    await context.close();
    log(`${label}: ${frames.length} frames down to ${top}px`);

    const dir = new URL(`${project.slug}/${viewportName}/`, OUTPUT_DIR);
    await rm(dir, { recursive: true, force: true });
    await mkdir(dir, { recursive: true });

    await writeWebp(frames[0], new URL('hero.webp', dir));
    for (let i = 1; i < frames.length; i++) {
        const number = String(i).padStart(2, '0');
        await writeWebp(frames[i], new URL(`frame-${number}.webp`, dir));
    }
    const scale = preset.deviceScaleFactor;
    const long = await stitch(stitchFrames, scrollTops, viewportHeight, scale, insets);
    await writeWebp(long, new URL('long.webp', dir));
}

const escapeHtml = text =>
    String(text).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function contactSheet(results) {
    const card = (dir, file) => `
            <figure>
                <a href="${dir}/${file.file}"><img src="${dir}/${file.file}" alt="${escapeHtml(dir)} ${file.file}" loading="lazy"></a>
                <figcaption>${file.file} · ${file.width}×${file.height} · ${Math.round(file.bytes / 1024)} KB</figcaption>
            </figure>`;

    const sections = results.map(({ project, viewports }) => {
        const rows = viewports.map(({ viewport, size, files }) => {
            const dir = `${project.slug}/${viewport}`;
            const long = files.find(f => f.file === 'long.webp');
            const frames = files.filter(f => f !== long);
            return `
        <div class="row ${viewport}">
            <h3>${viewport} <span>${size.width}×${size.height} · ${frames.length} frames</span></h3>
            <div class="layout">
                <div class="frames">${frames.map(f => card(dir, f)).join('')}
                </div>
                <div class="long">${card(dir, long)}
                </div>
            </div>
        </div>`;
        });
        return `
    <section>
        <h2>${escapeHtml(project.name)} <a href="${project.url}">${escapeHtml(project.url)}</a></h2>${rows.join('')}
    </section>`;
    });

    return `<!doctype html>
<!-- Generated by scripts/generate-captures.mjs. Do not edit by hand. -->
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Project captures</title>
    <style>
        :root { color-scheme: dark; --bg: #0b0d10; --panel: #15181d; --line: #262b33; --muted: #8a93a0; }
        * { box-sizing: border-box; }
        body { margin: 0; padding: 24px 16px 64px; background: var(--bg); color: #e8ecf1; font: 14px/1.4 system-ui, sans-serif; }
        h1 { margin: 0 0 4px; font-size: 20px; }
        h1 + p { margin: 0 0 24px; color: var(--muted); }
        section { margin-bottom: 48px; }
        h2 { font-size: 18px; border-bottom: 1px solid var(--line); padding-bottom: 8px; }
        h2 a { font-size: 13px; font-weight: 400; color: var(--muted); margin-left: 8px; }
        h3 { font-size: 14px; text-transform: uppercase; letter-spacing: .06em; }
        h3 span { text-transform: none; letter-spacing: 0; font-weight: 400; color: var(--muted); margin-left: 8px; }
        .layout { display: grid; grid-template-columns: 1fr 240px; gap: 16px; align-items: start; }
        .frames { display: grid; gap: 12px; }
        .desktop .frames { grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }
        .mobile .frames { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); }
        .long { position: sticky; top: 16px; max-height: calc(100vh - 32px); overflow-y: auto; }
        figure { margin: 0; background: var(--panel); border: 1px solid var(--line); border-radius: 6px; overflow: hidden; }
        figure img { display: block; width: 100%; height: auto; }
        figcaption { padding: 6px 8px; font: 11px/1.3 ui-monospace, monospace; color: var(--muted); }
        @media (max-width: 720px) { .layout { grid-template-columns: 1fr; } .long { position: static; max-height: none; } }
    </style>
</head>
<body>
    <h1>Project captures</h1>
    <p>Hero, one frame per scroll step (${Math.round(STEP_RATIO * 100)}% of the viewport) and the stitched long image. Click an image to open it.</p>${sections.join('')}
</body>
</html>
`;
}

const only = process.argv.slice(2);
const projects = only.length ? PROJECTS.filter(p => only.includes(p.slug)) : PROJECTS;
if (!projects.length) throw new Error(`No project matches ${only.join(', ')}`);

const browser = await chromium.launch();
try {
    for (const project of projects) {
        for (const preset of VIEWPORTS) await captureProject(browser, project, preset);
    }
} finally {
    await browser.close();
}

// The sheet always lists every project, reading back the files already on disk, so capturing a
// single project keeps the others in it.
const rank = name => (name === 'hero.webp' ? 0 : name === 'long.webp' ? 2 : 1);
const results = [];
for (const project of PROJECTS) {
    const viewports = [];
    for (const preset of VIEWPORTS) {
        const dir = new URL(`${project.slug}/${preset.name}/`, OUTPUT_DIR);
        const names = (await readdir(dir).catch(() => []))
            .filter(name => name.endsWith('.webp'))
            .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
        if (!names.length) continue;
        const files = [];
        for (const name of names) {
            const file = new URL(name, dir);
            const { width, height } = await sharp(file.pathname).metadata();
            files.push({ file: name, width, height, bytes: (await stat(file)).size });
        }
        viewports.push({ viewport: preset.name, size: preset.viewport, files });
    }
    if (viewports.length) results.push({ project, viewports });
}
await writeFile(new URL('index.html', OUTPUT_DIR), contactSheet(results));
log(`contact sheet: ${new URL('index.html', OUTPUT_DIR).pathname}`);
