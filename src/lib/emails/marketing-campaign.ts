import { EmailContainer, EmailHeader, EmailTitle, EmailButton, EmailSection } from './components';
import { EMAIL_SPACING, EMAIL_COLORS, EMAIL_TYPOGRAPHY } from './styles';
import { PUBLIC_SITE_URL } from '$env/static/public';

interface MarketingCampaignEmailProps {
    recipientName?: string;
    subject: string;
    content: string;
    ctaText?: string;
    ctaUrl?: string;
    date: string;
    recipientEmail?: string;
}

export function MarketingCampaignEmail({ 
    recipientName, 
    subject, 
    content, 
    ctaText, 
    ctaUrl,
    date,
    recipientEmail
}: MarketingCampaignEmailProps) {
    const header = EmailHeader({
        logoUrl: undefined,
        logoAlt: 'Pattyly',
        type: 'customer',
    });

    const title = EmailTitle(subject);

    // Contenu principal (supporte le HTML)
    // Le contenu peut inclure son propre "Bonjour" si nécessaire
    const mainContent = EmailSection({
        children: content
    });

    // Bouton CTA optionnel
    const ctaSection = ctaText && ctaUrl ? `
        <div style="text-align: center; margin: ${EMAIL_SPACING['2xl']} 0;">
            ${EmailButton({
                href: ctaUrl,
                text: ctaText,
                variant: 'primary'
            })}
        </div>
    ` : '';

    // URL de désabonnement avec l'email en paramètre
    const unsubscribeUrl = recipientEmail 
        ? `${PUBLIC_SITE_URL}/unsubscribe?email=${encodeURIComponent(recipientEmail)}`
        : `${PUBLIC_SITE_URL}/unsubscribe`;
    
    const footer = `
        <div style="text-align: center; margin-top: ${EMAIL_SPACING['2xl']}; padding-top: ${EMAIL_SPACING.lg}; border-top: 1px solid ${EMAIL_COLORS.neutral[200]};">
            <p style="color: ${EMAIL_COLORS.neutral[500]}; font-size: ${EMAIL_TYPOGRAPHY.fontSize.xs}; margin: ${EMAIL_SPACING.md} 0;">
                <a href="${unsubscribeUrl}" style="display: inline-block; padding: 8px 16px; color: ${EMAIL_COLORS.neutral[600]}; text-decoration: none; border: 1px solid ${EMAIL_COLORS.neutral[300]}; border-radius: 6px; font-size: ${EMAIL_TYPOGRAPHY.fontSize.sm}; font-weight: 500;">Se désabonner</a>
            </p>
        </div>
    `;

    return EmailContainer(
        `
            ${header}
            ${title}
            ${mainContent}
            ${ctaSection}
            ${footer}
        `
    );
}

