/**
 * Styles partagés pour les emails
 * Inspirés du design épuré de la homepage marketing
 */

// Couleurs de base
export const EMAIL_COLORS = {
	// Neutres (style homepage)
	neutral: {
		900: '#171717', // Texte principal
		800: '#262626', // Titres
		700: '#404040', // Texte secondaire
		600: '#525252', // Texte tertiaire
		500: '#737373', // Texte discret
		300: '#d4d4d4', // Bordures
		200: '#e5e5e5', // Bordures légères
		100: '#f5f5f5', // Arrière-plans légers
		50: '#fafafa', // Arrière-plans très légers
	},
	// Couleur d'accent Pattyly
	accent: {
		primary: '#FF6F61',
		hover: '#e85a4f',
		light: '#FFE8D6',
		light50: '#FFF5F0',
	},
	// Couleurs pour les boutiques (seront adaptées dynamiquement)
	shop: {
		primary: '#FF6F61', // Par défaut, sera remplacé par la couleur de la boutique
		hover: '#e85a4f',
		light: '#FFE8D6',
		light50: '#FFF5F0',
	},
};

// Typographie (style homepage)
export const EMAIL_TYPOGRAPHY = {
	fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
	fontSize: {
		base: '16px',
		sm: '14px',
		xs: '12px',
		lg: '18px',
		xl: '20px',
		'2xl': '24px',
		'3xl': '28px',
	},
	fontWeight: {
		light: 300,
		normal: 400,
		medium: 500,
		semibold: 600,
		bold: 700,
	},
	letterSpacing: {
		tight: '-0.03em',
		normal: '-0.02em',
		wide: '-0.01em',
	},
	lineHeight: {
		tight: '110%',
		normal: '140%',
		relaxed: '160%',
		loose: '180%',
	},
};

// Espacements (style homepage - généreux)
export const EMAIL_SPACING = {
	xs: '8px',
	sm: '12px',
	md: '16px',
	lg: '24px',
	xl: '32px',
	'2xl': '40px',
	'3xl': '48px',
};

// Rayons de bordure
export const EMAIL_BORDER_RADIUS = {
	sm: '4px',
	md: '6px',
	lg: '8px',
	xl: '12px',
	'2xl': '16px',
	full: '9999px',
};

// Largeur maximale des emails
export const EMAIL_MAX_WIDTH = '600px';

/**
 * Génère les styles de couleurs pour une boutique
 * Si aucune couleur n'est fournie, utilise les couleurs par défaut Pattyly
 */
export function getShopColors(shopColor?: string | null) {
	if (!shopColor) {
		return EMAIL_COLORS.shop;
	}

	// Convertir la couleur hex en RGB pour créer des variantes
	const hexToRgb = (hex: string) => {
		const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
		return result
			? {
					r: parseInt(result[1], 16),
					g: parseInt(result[2], 16),
					b: parseInt(result[3], 16),
				}
			: null;
	};

	const rgb = hexToRgb(shopColor);
	if (!rgb) {
		return EMAIL_COLORS.shop;
	}

	// Calculer la couleur hover (assombrir de 10%)
	const hover = {
		r: Math.max(0, rgb.r - 15),
		g: Math.max(0, rgb.g - 15),
		b: Math.max(0, rgb.b - 15),
	};

	const hoverHex = `#${((1 << 24) + (hover.r << 16) + (hover.g << 8) + hover.b).toString(16).slice(1)}`;

	// Calculer une couleur light (20% opacity)
	const light = {
		r: Math.min(255, rgb.r + 180),
		g: Math.min(255, rgb.g + 180),
		b: Math.min(255, rgb.b + 180),
	};

	const lightHex = `#${((1 << 24) + (light.r << 16) + (light.g << 8) + light.b).toString(16).slice(1)}`;

	const light50 = {
		r: Math.min(255, rgb.r + 240),
		g: Math.min(255, rgb.g + 240),
		b: Math.min(255, rgb.b + 240),
	};

	const light50Hex = `#${((1 << 24) + (light50.r << 16) + (light50.g << 8) + light50.b).toString(16).slice(1)}`;

	return {
		primary: shopColor,
		hover: hoverHex,
		light: lightHex,
		light50: light50Hex,
	};
}
