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
			includeAssets: ['favicon.ico', 'images/logo_icone.png', 'icons/icon-192x192.png', 'icons/icon-512x512.png'],
			manifest: {
				name: 'Pattyly - Plateforme pour pâtissiers',
				short_name: 'Pattyly',
				description: 'Plateforme de gestion et de vente en ligne pour pâtissiers indépendants',
				theme_color: '#ffffff',
				background_color: '#ffffff',
				display: 'standalone',
				orientation: 'portrait',
				scope: '/',
				start_url: '/',
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
					},
					{
						src: '/icons/icon-192x192.png',
						sizes: '192x192',
						type: 'image/png',
						purpose: 'maskable'
					},
					{
						src: '/icons/icon-512x512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'maskable'
					}
				]
			},
			workbox: {
				globPatterns: ['**/*.{js,css,svg,png,ico,woff,woff2}'],
				globIgnores: ['**/index.html', '**/sw.js', '**/workbox-*.js'],
				navigateFallback: null,
				inlineWorkboxRuntime: true,
				runtimeCaching: [
					{
						urlPattern: /^https:\/\/api\.supabase\.co\/.*/i,
						handler: 'NetworkFirst',
						options: {
							cacheName: 'supabase-api-cache',
							expiration: {
								maxEntries: 10,
								maxAgeSeconds: 60 * 60 * 24 // 24 heures
							},
							cacheableResponse: {
								statuses: [0, 200]
							}
						}
					},
					{
						urlPattern: /^https:\/\/.*\.cloudinary\.com\/.*/i,
						handler: 'CacheFirst',
						options: {
							cacheName: 'cloudinary-images-cache',
							expiration: {
								maxEntries: 50,
								maxAgeSeconds: 60 * 60 * 24 * 30 // 30 jours
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
