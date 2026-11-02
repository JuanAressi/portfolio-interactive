import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    site: 'https://juanaressi.github.io',
    base: '/portfolio-interactive/',
    output: 'static',
    outDir: 'dist',
    // The toolbar would sit on top of the bottom nav during development.
    devToolbar: { enabled: false },
    vite: {
        plugins: [tailwindcss()],
    },
});
