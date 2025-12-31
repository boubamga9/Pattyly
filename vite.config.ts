import { sveltekit } from '@sveltejs/kit/vite';
import Icons from 'unplugin-icons/vite';
import { defineConfig } from 'vitest/config';
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
		globals: true,
		environment: 'node',
		include: ['src/**/*.{test,spec}.{js,ts}'],
		setupFiles: ['./src/lib/test/setup.ts'],
	},
});
