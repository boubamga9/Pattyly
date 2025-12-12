/**
 * Logger utilitaire qui n'affiche les logs qu'en développement
 * Fonctionne côté client et serveur
 */

// Détecter l'environnement
// En SvelteKit, import.meta.env.DEV est disponible partout
let isDev = false;
try {
	// Côté client ou serveur SvelteKit
	isDev = import.meta.env?.DEV === true;
} catch {
	// Fallback pour Node.js pur
	isDev = typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production';
}

export const logger = {
	log: (...args: any[]) => {
		if (isDev) {
			console.log(...args);
		}
	},
	error: (...args: any[]) => {
		// Les erreurs sont toujours loggées, même en production
		console.error(...args);
	},
	warn: (...args: any[]) => {
		if (isDev) {
			console.warn(...args);
		}
	},
	info: (...args: any[]) => {
		if (isDev) {
			console.info(...args);
		}
	},
};
