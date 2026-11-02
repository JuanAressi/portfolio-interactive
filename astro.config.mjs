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
