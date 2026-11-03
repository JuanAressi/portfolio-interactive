import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    site: process.env.SITE || 'https://portfolio.juan-aressi.workers.dev',
    base: process.env.BASE_PATH || '/',
    output: 'static',
    outDir: 'dist',
    i18n: {
        defaultLocale: 'es',
        locales: ['es', 'en'],
        routing: { prefixDefaultLocale: false },
    },
    integrations: [
        sitemap({
            i18n: { defaultLocale: 'es', locales: { es: 'es', en: 'en' } },
            filter: page => !new URL(page).pathname.includes('/og/'),
        }),
    ],
    // The toolbar would sit on top of the bottom nav during development.
    devToolbar: { enabled: false },
    vite: {
        plugins: [tailwindcss()],
        build: {
            // three.js alone is 590 kB. The limit applies to every chunk, so keep it tight.
            chunkSizeWarningLimit: 600,
            rolldownOptions: {
                output: {
                    // Its own file, so a deploy that doesn't update three.js keeps it cached.
                    codeSplitting: {
                        groups: [{ name: 'three', test: /node_modules[\\/]three[\\/]/ }],
                    },
                },
            },
        },
    },
});
