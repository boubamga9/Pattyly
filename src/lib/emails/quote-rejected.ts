import { EmailContainer, EmailHeader, EmailFooter, EmailTitle, EmailParagraph, EmailButton, EmailTable } from './components';
import { EMAIL_SPACING, EMAIL_COLORS } from './styles';

interface QuoteRejectedProps {
    customerName: string;
    customerEmail: string;
    quoteId: string;
    orderUrl: string;
    date: string;
}

export function QuoteRejectedEmail({
    customerName,
    customerEmail,
    quoteId,
    orderUrl,
    date,
}: QuoteRejectedProps) {
    const header = EmailHeader({
        logoUrl: undefined,
        logoAlt: 'Pattyly',
        type: 'pastry',
    });

    const title = EmailTitle('Devis refusé');

    const intro = EmailParagraph(
        `Le client <strong>${customerName}</strong> a refusé votre devis pour la demande #${quoteId}.<br /><br />Aucune action n'est requise de votre part.`
    );

    const customerInfo = EmailTable([
        { label: 'Nom', value: customerName },
        { label: 'Email', value: `<a href="mailto:${customerEmail}" style="color: ${EMAIL_COLORS.accent.primary};">${customerEmail}</a>` },
    ]);

    const ctaSection = `
        <div style="text-align: center; margin: ${EMAIL_SPACING['2xl']} 0;">
            <p style="margin-bottom: ${EMAIL_SPACING.md}; color: ${EMAIL_COLORS.neutral[700]}; font-size: 14px;">Retrouvez tous les détails du devis refusé</p>
            ${EmailButton({
                href: orderUrl,
                text: 'Voir le détail du devis',
                variant: 'primary',
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
            ${customerInfo}
            ${ctaSection}
            ${footer}
        `
    );
}