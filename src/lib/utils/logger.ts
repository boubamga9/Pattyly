/**
 * Logger utilitaire qui n'affiche les logs qu'en développement
 * Fonctionne côté client et serveur
 * 
 * Utilisez ce logger au lieu de console.log/error/warn pour éviter
 * les logs en production et améliorer les performances.
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

/**
 * Logger avec support conditionnel pour dev/prod
 */
export const logger = {
	/**
	 * Log en développement uniquement
	 */
	log: (...args: unknown[]) => {
		if (isDev) {
			console.log(...args);
		}
	},
	/**
	 * Log les erreurs (toujours, même en production)
	 */
	error: (...args: unknown[]) => {
		// Les erreurs sont toujours loggées, même en production
		console.error(...args);
	},
	/**
	 * Log les warnings en développement uniquement
	 */
	warn: (...args: unknown[]) => {
		if (isDev) {
			console.warn(...args);
		}
	},
	/**
	 * Log les infos en développement uniquement
	 */
	info: (...args: unknown[]) => {
		if (isDev) {
			console.info(...args);
		}
	},
	/**
	 * Log de debug (uniquement en développement)
	 */
	debug: (...args: unknown[]) => {
		if (isDev) {
			console.debug(...args);
		}
	},
};
