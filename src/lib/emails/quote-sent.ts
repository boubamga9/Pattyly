import { EmailContainer, EmailHeader, EmailFooter, EmailTitle, EmailParagraph, EmailButton } from './components';
import { EMAIL_SPACING, EMAIL_COLORS } from './styles';

interface QuoteSentProps {
    customerName: string;
    shopName: string;
    shopLogo?: string;
    quoteId: string;
    orderUrl: string;
    date: string;
    shopColor?: string | null;
}

export function QuoteSentEmail({
    customerName,
    shopName,
    shopLogo,
    quoteId,
    orderUrl,
    date,
    shopColor,
}: QuoteSentProps) {
    const header = EmailHeader({
        logoUrl: shopLogo,
        logoAlt: shopName,
        type: 'customer',
        shopColor,
    });

    const title = EmailTitle('Votre devis est prêt');

    const intro = EmailParagraph(
        `Bonjour ${customerName},<br /><br />Merci pour votre demande personnalisée. Voici votre devis détaillé pour votre gâteau.`
    );

    const ctaSection = `
        <div style="text-align: center; margin: ${EMAIL_SPACING['2xl']} 0;">
            <p style="margin-bottom: ${EMAIL_SPACING.md}; color: ${EMAIL_COLORS.neutral[700]}; font-size: 14px;">Retrouvez tous les détails de votre devis</p>
            ${EmailButton({
                href: orderUrl,
                text: 'Voir le détail du devis',
                variant: 'primary',
                shopColor,
            })}
        </div>
    `;

    const footer = EmailFooter({
        requestId: quoteId,
        date,
        showOrderId: false,
        showRequestId: true,
    });

    return EmailContainer(
        `
            ${header}
            ${title}
            ${intro}
            ${ctaSection}
            ${footer}
        `,
        shopColor
    );
}