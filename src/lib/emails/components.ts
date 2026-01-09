/**
 * Composants réutilisables pour les emails
 * Style épuré inspiré de la homepage marketing
 */

import { PUBLIC_SITE_URL } from '$env/static/public';
import { EMAIL_COLORS, EMAIL_TYPOGRAPHY, EMAIL_SPACING, EMAIL_BORDER_RADIUS, EMAIL_MAX_WIDTH, getShopColors } from './styles';

interface EmailHeaderProps {
	logoUrl?: string;
	logoAlt: string;
	type: 'customer' | 'pastry'; // Pour adapter le style
	shopColor?: string | null; // Couleur de la boutique (pour les emails clients)
}

interface EmailFooterProps {
	orderId?: string;
	requestId?: string;
	date: string;
	showOrderId?: boolean;
	showRequestId?: boolean;
}

interface EmailButtonProps {
	href: string;
	text: string;
	variant?: 'primary' | 'outline';
	shopColor?: string | null; // Pour les emails clients
}

interface EmailSectionProps {
	title?: string;
	children: string;
	showBorder?: boolean;
}

/**
 * Header épuré pour les emails
 * - Logo boutique (grand) pour les clients
 * - Logo Pattyly (petit, discret) pour les pâtissiers
 */
export function EmailHeader({ logoUrl, logoAlt, type, shopColor }: EmailHeaderProps): string {
	const isCustomer = type === 'customer';
	const logoSize = isCustomer ? '60px' : '30px';
	const logoMargin = isCustomer ? EMAIL_SPACING.xl : EMAIL_SPACING.lg;

	// Pour les clients, utiliser le logo de la boutique ou Pattyly par défaut
	// Pour les pâtissiers, toujours utiliser Pattyly
	const finalLogoUrl = isCustomer 
		? (logoUrl || `${PUBLIC_SITE_URL}/images/logo_icone.png`)
		: `${PUBLIC_SITE_URL}/images/logo_icone.png`;

	return `
		<div style="text-align: center; margin-bottom: ${logoMargin}; padding-top: ${EMAIL_SPACING.xl};">
			<img
				src="${finalLogoUrl}"
				alt="${logoAlt}"
				style="height: ${logoSize}; margin-bottom: ${EMAIL_SPACING.sm}; display: inline-block;"
			/>
			${isCustomer ? `
				<div style="height: 1px; background-color: ${EMAIL_COLORS.neutral[200]}; margin: ${EMAIL_SPACING.lg} auto; max-width: 120px;"></div>
			` : ''}
		</div>
	`;
}

/**
 * Footer minimaliste pour les emails
 */
export function EmailFooter({ orderId, requestId, date, showOrderId = true, showRequestId = true }: EmailFooterProps): string {
	return `
		<div style="text-align: center; margin-top: ${EMAIL_SPACING['2xl']}; padding-top: ${EMAIL_SPACING.lg}; border-top: 1px solid ${EMAIL_COLORS.neutral[200]};">
			${showOrderId && orderId ? `
				<p style="color: ${EMAIL_COLORS.neutral[600]}; font-size: ${EMAIL_TYPOGRAPHY.fontSize.sm}; margin: ${EMAIL_SPACING.xs} 0;">
					<strong style="font-weight: ${EMAIL_TYPOGRAPHY.fontWeight.medium};">Numéro de commande :</strong> #${orderId}
				</p>
			` : ''}
			${showRequestId && requestId ? `
				<p style="color: ${EMAIL_COLORS.neutral[600]}; font-size: ${EMAIL_TYPOGRAPHY.fontSize.sm}; margin: ${EMAIL_SPACING.xs} 0;">
					<strong style="font-weight: ${EMAIL_TYPOGRAPHY.fontWeight.medium};">Numéro de demande :</strong> #${requestId}
				</p>
			` : ''}
			<p style="color: ${EMAIL_COLORS.neutral[500]}; font-size: ${EMAIL_TYPOGRAPHY.fontSize.xs}; margin-top: ${EMAIL_SPACING.sm};">
				${date}
			</p>
		</div>
	`;
}

/**
 * Bouton épuré pour les emails
 * Style minimaliste inspiré de la homepage
 */
export function EmailButton({ href, text, variant = 'primary', shopColor }: EmailButtonProps): string {
	const colors = shopColor ? getShopColors(shopColor) : EMAIL_COLORS.accent;
	
	if (variant === 'outline') {
		// Style outline (comme la homepage)
		return `
			<a
				href="${href}"
				style="display: inline-block; padding: 14px 28px; border: 2px solid ${colors.primary}; color: ${colors.primary}; text-decoration: none; border-radius: ${EMAIL_BORDER_RADIUS.xl}; font-weight: ${EMAIL_TYPOGRAPHY.fontWeight.medium}; font-size: ${EMAIL_TYPOGRAPHY.fontSize.base}; transition: all 0.3s ease;"
			>
				${text}
			</a>
		`;
	}
	
	// Style primary (fond coloré)
	return `
		<a
			href="${href}"
			style="display: inline-block; padding: 14px 28px; background-color: ${colors.primary}; color: white; text-decoration: none; border-radius: ${EMAIL_BORDER_RADIUS.xl}; font-weight: ${EMAIL_TYPOGRAPHY.fontWeight.medium}; font-size: ${EMAIL_TYPOGRAPHY.fontSize.base}; transition: all 0.3s ease; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);"
		>
			${text}
		</a>
	`;
}

/**
 * Section de contenu épurée
 * Style minimaliste avec espacement généreux
 */
export function EmailSection({ title, children, showBorder = false }: EmailSectionProps): string {
	const borderStyle = showBorder 
		? `border-top: 1px solid ${EMAIL_COLORS.neutral[200]}; padding-top: ${EMAIL_SPACING.lg};`
		: '';
	
	return `
		<div style="margin-bottom: ${EMAIL_SPACING.lg}; ${borderStyle}">
			${title ? `
				<h3 style="color: ${EMAIL_COLORS.neutral[900]}; font-size: ${EMAIL_TYPOGRAPHY.fontSize.xl}; font-weight: ${EMAIL_TYPOGRAPHY.fontWeight.semibold}; letter-spacing: ${EMAIL_TYPOGRAPHY.letterSpacing.normal}; margin: 0 0 ${EMAIL_SPACING.md} 0; line-height: ${EMAIL_TYPOGRAPHY.lineHeight.tight};">
					${title}
				</h3>
			` : ''}
			<div style="color: ${EMAIL_COLORS.neutral[700]}; font-size: ${EMAIL_TYPOGRAPHY.fontSize.base}; line-height: ${EMAIL_TYPOGRAPHY.lineHeight.relaxed}; font-weight: ${EMAIL_TYPOGRAPHY.fontWeight.normal}; letter-spacing: ${EMAIL_TYPOGRAPHY.letterSpacing.wide};">
				${children}
			</div>
		</div>
	`;
}

/**
 * Container principal pour tous les emails
 * Style épuré inspiré de la homepage avec dégradé subtil en arrière-plan
 */
export function EmailContainer(children: string, shopColor?: string | null): string {
	// Pour les emails clients : utiliser la couleur light de la boutique
	// Pour les emails pâtissiers : utiliser la couleur par défaut Pattyly
	const colors = shopColor ? getShopColors(shopColor) : EMAIL_COLORS.accent;
	
	// Dégradé subtil inspiré du hero de la homepage
	// Le hero utilise from-[#FFE8D6]/30 via-transparent to-transparent
	// Pour les emails clients, on adapte la couleur selon la boutique
	const gradientColor = shopColor ? colors.light : EMAIL_COLORS.accent.light;
	
	// Convertir hex en rgb pour rgba (format: #FFE8D6 -> rgba(255, 232, 214, 0.3))
	const hexToRgb = (hex: string) => {
		// Retirer le # si présent
		const cleanHex = hex.replace('#', '');
		const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(cleanHex);
		return result
			? {
					r: parseInt(result[1], 16),
					g: parseInt(result[2], 16),
					b: parseInt(result[3], 16),
				}
			: null;
	};
	
	const rgb = hexToRgb(gradientColor);
	// Opacité de 30% comme le hero, mais adaptée pour les emails (un peu plus subtile)
	const gradientRgba = rgb 
		? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.25)` // Opacité subtile pour les emails
		: `rgba(255, 232, 214, 0.25)`; // Fallback couleur Pattyly (#FFE8D6)
	
	return `
		<div style="background: linear-gradient(to bottom, ${gradientRgba} 0%, transparent 60%); min-height: 100vh; padding: ${EMAIL_SPACING.xl} 0;">
			<div style="font-family: ${EMAIL_TYPOGRAPHY.fontFamily}; color: ${EMAIL_COLORS.neutral[900]}; max-width: ${EMAIL_MAX_WIDTH}; margin: 0 auto; padding: ${EMAIL_SPACING.xl} ${EMAIL_SPACING.lg}; background-color: white; border-radius: ${EMAIL_BORDER_RADIUS.xl}; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);">
				${children}
			</div>
		</div>
	`;
}

/**
 * Titre principal pour les emails
 * Style premium inspiré de la homepage
 */
export function EmailTitle(text: string, color?: string): string {
	const titleColor = color || EMAIL_COLORS.neutral[900];
	return `
		<h2 style="color: ${titleColor}; margin: 0 0 ${EMAIL_SPACING.md} 0; font-size: ${EMAIL_TYPOGRAPHY.fontSize['2xl']}; font-weight: ${EMAIL_TYPOGRAPHY.fontWeight.semibold}; letter-spacing: ${EMAIL_TYPOGRAPHY.letterSpacing.tight}; line-height: ${EMAIL_TYPOGRAPHY.lineHeight.tight};">
			${text}
		</h2>
	`;
}

/**
 * Paragraphe épuré avec espacement généreux
 */
export function EmailParagraph(text: string, style: string = ''): string {
	return `
		<p style="margin: 0 0 ${EMAIL_SPACING.md} 0; color: ${EMAIL_COLORS.neutral[700]}; font-size: ${EMAIL_TYPOGRAPHY.fontSize.base}; line-height: ${EMAIL_TYPOGRAPHY.lineHeight.relaxed}; font-weight: ${EMAIL_TYPOGRAPHY.fontWeight.normal}; letter-spacing: ${EMAIL_TYPOGRAPHY.letterSpacing.wide}; ${style}">
			${text}
		</p>
	`;
}

/**
 * Séparateur élégant (style homepage)
 */
export function EmailSeparator(color?: string): string {
	const separatorColor = color || EMAIL_COLORS.neutral[300];
	return `
		<div style="display: flex; align-items: center; justify-content: center; gap: ${EMAIL_SPACING.md}; margin: ${EMAIL_SPACING.xl} 0;">
			<div style="height: 1px; width: 64px; background-color: ${separatorColor};"></div>
			<div style="height: 6px; width: 6px; border-radius: 50%; background-color: ${color || EMAIL_COLORS.accent.primary};"></div>
			<div style="height: 1px; flex: 1; max-width: 320px; background-color: ${separatorColor};"></div>
		</div>
	`;
}

/**
 * Table épurée pour afficher des informations
 * Style minimaliste sans bordures
 */
export function EmailTable(rows: Array<{ label: string; value: string }>): string {
	return `
		<table style="width: 100%; border-collapse: collapse; margin: ${EMAIL_SPACING.lg} 0;">
			${rows.map(row => `
				<tr>
					<td style="padding: ${EMAIL_SPACING.sm} 0; font-weight: ${EMAIL_TYPOGRAPHY.fontWeight.medium}; color: ${EMAIL_COLORS.neutral[900]}; width: 140px; vertical-align: top; font-size: ${EMAIL_TYPOGRAPHY.fontSize.sm};">
						${row.label} :
					</td>
					<td style="padding: ${EMAIL_SPACING.sm} 0; color: ${EMAIL_COLORS.neutral[700]}; vertical-align: top; font-size: ${EMAIL_TYPOGRAPHY.fontSize.base};">
						${row.value}
					</td>
				</tr>
			`).join('')}
		</table>
	`;
}
