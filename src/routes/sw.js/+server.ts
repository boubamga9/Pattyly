import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Route explicite pour servir le service worker
 * Empêche le routage vers les routes dynamiques comme [slug]/product/[id]
 */
export const GET: RequestHandler = async ({ url }) => {
	// Le service worker doit être servi depuis la racine, pas depuis une sous-route
	// Si on est sur une sous-route (ex: /pattyly/product/sw.js), rediriger vers /sw.js
	if (url.pathname !== '/sw.js') {
		throw error(404, 'Service Worker not found');
	}

	// Le service worker est géré par vite-plugin-pwa et sera servi automatiquement
	// Cette route existe juste pour éviter le routage vers les routes dynamiques
	throw error(404, 'Service Worker not found');
};




