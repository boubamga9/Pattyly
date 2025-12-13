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
			injectRegister: false, // Ne pas enregistrer automatiquement - on le fait manuellement pour les pâtissiers uniquement
			registerType: 'autoUpdate', // Mode de mise à jour (une fois enregistré)
			strategies: 'injectManifest',
			srcDir: 'src',
			filename: 'sw.ts',
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
			injectManifest: {
				globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
				globIgnores: ['**/node_modules/**/*', 'sw.js', 'workbox-*.js']
			},
			// Configuration pour forcer le service worker à la racine
			registerOptions: {
				scope: '/'
			},
			devOptions: {
				enabled: false // Désactivé en dev pour éviter les dépendances circulaires
				// Pour tester les notifications push, utiliser: npm run build && npm run preview
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
		],
		host: true, // Écouter sur toutes les interfaces réseau
		port: 5176
	},
	preview: {
		host: true, // Écouter sur toutes les interfaces réseau
		port: 4173
	},
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
	},
});
