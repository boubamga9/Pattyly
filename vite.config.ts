import { sveltekit } from '@sveltejs/kit/vite';
import Icons from 'unplugin-icons/vite';
import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
	plugins: [
		sveltekit(),
		Icons({
			compiler: 'svelte',
			autoInstall: true,
			iconCustomizer(collection, icon, props) {
				// customize all icons in this collection
				if (collection === 'lucide') {
					props.width = '1.5rem';
					props.height = '1.5rem';
				}
			},
		}),
		VitePWA({
			registerType: 'autoUpdate',
			manifest: {
				name: 'Pattyly',
				short_name: 'Pattyly',
				start_url: '/',
				scope: '/',
				display: 'standalone',
				background_color: '#ffffff',
				theme_color: '#ffffff',
				orientation: 'any',
				icons: [
					{
						src: '/icons/icon-192x192.png',
						sizes: '192x192',
						type: 'image/png',
						purpose: 'any'
					},
					{
						src: '/icons/icon-512x512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'any'
					}
				]
			},
			workbox: {
				navigateFallback: '/',
				navigateFallbackDenylist: [/^\/_/, /^\/api/],
				skipWaiting: true,
				clientsClaim: true,
				cleanupOutdatedCaches: true,
				// Exclure Cloudinary du cache pour éviter les erreurs 404
				runtimeCaching: [
					{
						urlPattern: /^https:\/\/res\.cloudinary\.com\/.*/i,
						handler: 'NetworkOnly',
						options: {
							cacheName: 'cloudinary-images',
							expiration: {
								maxEntries: 0, // Ne pas mettre en cache
								maxAgeSeconds: 0
							},
							cacheableResponse: {
								statuses: [0, 200]
							}
						}
					},
					// Cache pour les autres ressources statiques
					{
						urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
						handler: 'CacheFirst',
						options: {
							cacheName: 'google-fonts',
							expiration: {
								maxEntries: 10,
								maxAgeSeconds: 60 * 60 * 24 * 365 // 1 an
							}
						}
					}
				]
			},
			devOptions: {
				enabled: false
			}
		}),
	],
	resolve: {
		alias: {
			'$src': path.resolve(__dirname, './src'),
		},
	},
	server: {
		// Allow ngrok and other external hosts
		allowedHosts: [
			'.ngrok-free.dev',
			'.ngrok.io',
			'.ngrok.app'
		]
	},
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
	},
});
