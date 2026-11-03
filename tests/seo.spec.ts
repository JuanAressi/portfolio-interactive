import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { collectConsoleProblems } from './console-problems.ts';
import { dictionaries } from '../src/i18n/index.ts';

const ROUTES = [
    { locale: 'es', route: './', path: '', ogLocale: 'es_AR', ogAlternate: 'en_US' },
    { locale: 'en', route: './en/', path: 'en/', ogLocale: 'en_US', ogAlternate: 'es_AR' },
] as const;

const NOT_FOUND_ROUTE = './this-page-does-not-exist/';

function metaContent(page: Page, attribute: 'name' | 'property', value: string) {
    return page.locator(`meta[${attribute}="${value}"]`).getAttribute('content');
}

async function hreflangs(page: Page): Promise<Record<string, string>> {
    const links = await page.locator('link[rel="alternate"][hreflang]').all();
    const entries = await Promise.all(
        links.map(async link => [
            await link.getAttribute('hreflang'),
            await link.getAttribute('href'),
        ])
    );
    return Object.fromEntries(entries);
}

/** The pages hold production URLs: this is the same file on the server under test. */
function local(absoluteUrl: string, baseURL: string): string {
    return new URL(new URL(absoluteUrl).pathname, baseURL).href;
}

/** Width and height from the IHDR chunk, which always comes first in a PNG. */
function pngSize(png: Buffer): { width: number; height: number } {
    return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

async function fetchOk(request: APIRequestContext, url: string): Promise<Buffer> {
    const response = await request.get(url);
    expect(response.status(), url).toBe(200);
    return response.body();
}

test.describe('head', () => {
    test.use({ javaScriptEnabled: false });

    for (const { locale, route, path, ogLocale, ogAlternate } of ROUTES) {
        test(`${locale}: title, description and social tags`, async ({ page, baseURL }) => {
            const { title, description } = dictionaries[locale].meta;
            await page.goto(route);

            const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
            expect(canonical).toMatch(/^https:\/\//);
            expect(new URL(canonical!).pathname).toBe(`${new URL(baseURL!).pathname}${path}`);

            await expect(page).toHaveTitle(title);
            expect(await metaContent(page, 'name', 'description')).toBe(description);
            expect(await metaContent(page, 'name', 'theme-color')).toBe('#070b10');
            expect(await metaContent(page, 'name', 'twitter:card')).toBe('summary_large_image');
            expect(await metaContent(page, 'property', 'og:type')).toBe('website');
            expect(await metaContent(page, 'property', 'og:title')).toBe(title);
            expect(await metaContent(page, 'property', 'og:description')).toBe(description);
            expect(await metaContent(page, 'property', 'og:url')).toBe(canonical);
            expect(await metaContent(page, 'property', 'og:locale')).toBe(ogLocale);
            expect(await metaContent(page, 'property', 'og:locale:alternate')).toBe(ogAlternate);
        });

        test(`${locale}: og:image is a 1200×630 file`, async ({ page, request, baseURL }) => {
            await page.goto(route);

            const image = (await metaContent(page, 'property', 'og:image'))!;
            expect(image).toMatch(/^https:\/\//);

            const png = await fetchOk(request, local(image, baseURL!));
            expect(pngSize(png)).toEqual({ width: 1200, height: 630 });
        });

        test(`${locale}: the JSON-LD describes the person`, async ({ page }) => {
            await page.goto(route);

            const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
            const person = JSON.parse(
                (await page.locator('script[type="application/ld+json"]').textContent())!
            );
            const contactLinks = await page
                .locator('#contact a[target="_blank"]')
                .evaluateAll(links => links.map(link => (link as HTMLAnchorElement).href));

            expect(person).toEqual({
                '@context': 'https://schema.org',
                '@type': 'Person',
                name: 'Juan Aressi',
                jobTitle: dictionaries[locale].meta.role,
                url: canonical,
                sameAs: contactLinks,
                worksFor: {
                    '@type': 'Organization',
                    name: 'Cubrama',
                    url: 'https://cubrama.com',
                },
            });
            expect(contactLinks).toHaveLength(2);
        });
    }

    test('the hreflang links are reciprocal and x-default is Spanish', async ({ page }) => {
        await page.goto('./');
        const fromEs = await hreflangs(page);
        const esCanonical = await page.locator('link[rel="canonical"]').getAttribute('href');

        await page.goto('./en/');
        const fromEn = await hreflangs(page);
        const enCanonical = await page.locator('link[rel="canonical"]').getAttribute('href');

        expect(fromEs).toEqual({ es: esCanonical, en: enCanonical, 'x-default': esCanonical });
        expect(fromEn).toEqual(fromEs);
    });
});

test.describe('icons', () => {
    test('every icon in the head and in the manifest exists', async ({ page, request }) => {
        await page.goto('./');

        const iconUrls = await page
            .locator('link[rel="icon"], link[rel="apple-touch-icon"]')
            .evaluateAll(links => links.map(link => (link as HTMLLinkElement).href));
        expect(iconUrls).toHaveLength(3);
        for (const url of iconUrls) await fetchOk(request, url);

        const manifestUrl = await page
            .locator('link[rel="manifest"]')
            .evaluate(link => (link as HTMLLinkElement).href);
        const manifest = JSON.parse((await fetchOk(request, manifestUrl)).toString());
        for (const icon of manifest.icons) {
            await fetchOk(request, new URL(icon.src, manifestUrl).href);
        }
    });

    test('the raster icons have the expected sizes', async ({ request }) => {
        const touchIcon = await fetchOk(request, './apple-touch-icon.png');
        expect(pngSize(touchIcon)).toEqual({ width: 180, height: 180 });

        const ico = await fetchOk(request, './favicon.ico');
        expect(ico.readUInt16LE(2)).toBe(1); // ICO type.
        expect([ico.readUInt8(6), ico.readUInt8(7)]).toEqual([32, 32]);
    });

    // Whether a headless browser asks for the favicon on its own isn't guaranteed, so the page does
    // it: a 404 here reaches the console the same way a tab's request does.
    test('loading the favicon leaves the console clean', async ({ page }) => {
        const problems = collectConsoleProblems(page);
        await page.goto('./');

        const statuses = await page
            .locator('link[rel="icon"]')
            .evaluateAll(async links =>
                Promise.all(
                    links.map(async link => (await fetch((link as HTMLLinkElement).href)).status)
                )
            );

        expect(statuses).toEqual([200, 200]);
        expect(problems.filter(problem => /favicon|404/.test(problem))).toEqual([]);
    });
});

test.describe('crawlers', () => {
    test('robots.txt points to the sitemap, and the sitemap has both routes', async ({
        request,
        baseURL,
    }) => {
        const robots = (await fetchOk(request, './robots.txt')).toString();
        const sitemapIndex = robots.match(/^Sitemap: (.+)$/m)?.[1];
        expect(sitemapIndex).toBeTruthy();
        expect(robots).not.toMatch(/^Disallow: \/$/m);

        const index = (await fetchOk(request, local(sitemapIndex!, baseURL!))).toString();
        const sitemapUrl = index.match(/<loc>(.+?)<\/loc>/)?.[1];
        const sitemap = (await fetchOk(request, local(sitemapUrl!, baseURL!))).toString();

        const pageUrls = [...sitemap.matchAll(/<loc>(.+?)<\/loc>/g)].map(match => match[1]);
        const paths = pageUrls.map(url => new URL(url).pathname).sort();
        const base = new URL(baseURL!).pathname;
        expect(paths).toEqual([base, `${base}en/`]);

        const alternates = [...sitemap.matchAll(/hreflang="(\w+)"/g)].map(match => match[1]);
        expect(alternates.sort()).toEqual(['en', 'en', 'es', 'es']);
    });

    test.describe('without running JS', () => {
        test.use({ javaScriptEnabled: false });

        for (const { locale } of ROUTES) {
            test(`the internal ${locale} image page is noindex`, async ({ page }) => {
                await page.goto(`./og/${locale}/`);
                expect(await metaContent(page, 'name', 'robots')).toBe('noindex');
            });
        }
    });
});

test.describe('404', () => {
    test.use({ javaScriptEnabled: false });

    test('an unknown URL answers 404 with the page in both languages', async ({ page }) => {
        const response = await page.goto(NOT_FOUND_ROUTE);

        expect(response?.status()).toBe(404);
        await expect(page.locator('h1')).toHaveText(dictionaries.es.notFound.title);
        await expect(page.locator('p[lang="en"]')).toHaveText(dictionaries.en.notFound.title);
        await expect(page.locator('main .line')).toHaveCount(3);
        await expect(page.locator('canvas, #canvas-container')).toHaveCount(0);
        expect(await metaContent(page, 'name', 'robots')).toBe('noindex');
    });

    for (const { locale, path } of ROUTES) {
        test(`it links to the ${locale} route`, async ({ page, baseURL }) => {
            await page.goto(NOT_FOUND_ROUTE);

            await page.locator(`main a[hreflang="${locale}"]`).click();

            await expect(page).toHaveURL(`${baseURL}${path}`);
            await expect(page.locator('html')).toHaveAttribute('lang', locale);
        });
    }
});
