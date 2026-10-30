import type { ManifestOptions } from 'vite-plugin-pwa';
export const manifest: Partial<ManifestOptions> = {
 name: 'TicTac', short_name: 'TicTac', lang: 'fr', display: 'standalone', theme_color: '#164e63', background_color: '#fffaf0', start_url: './', scope: './',
 icons: [ { src: 'icons/tictac-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' }, { src: 'icons/tictac-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }, { src: 'icons/tictac-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' } ]
};
