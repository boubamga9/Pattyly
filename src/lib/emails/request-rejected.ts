import { EmailContainer, EmailHeader, EmailFooter, EmailTitle, EmailParagraph, EmailButton, EmailSection } from './components';
import { EMAIL_SPACING, EMAIL_COLORS } from './styles';

interface RequestRejectedProps {
    customerName: string;
    shopName: string;
    shopLogo?: string;
    reason?: string;
    requestId: string;
    catalogUrl: string;
    date: string;
    shopColor?: string | null;
}

export function RequestRejectedEmail({
    customerName,
    shopName,
    shopLogo,
    reason,
    requestId,
    catalogUrl,
    date,
    shopColor,
}: RequestRejectedProps) {
    const header = EmailHeader({
        logoUrl: shopLogo,
        logoAlt: shopName,
        type: 'customer',
        shopColor,
    });

    const title = EmailTitle('Demande refusée');

    const intro = EmailParagraph(
        `Bonjour ${customerName},<br /><br />Malheureusement, nous ne pouvons pas honorer votre demande pour cette date.`
    );

    const reasonSection = reason ? `
        <div style="margin: ${EMAIL_SPACING.lg} 0; padding: ${EMAIL_SPACING.lg}; border-radius: ${EMAIL_SPACING.md}; background-color: ${EMAIL_COLORS.neutral[50]};">
            <h3 style="margin: 0 0 ${EMAIL_SPACING.sm} 0; color: ${EMAIL_COLORS.neutral[900]}; font-size: 16px; font-weight: 600;">Raisons du refus</h3>
            <p style="margin: 0; color: ${EMAIL_COLORS.neutral[700]}; font-size: 14px; line-height: 160%;">${reason}</p>
        </div>
    ` : '';

    const ctaSection = `
        <div style="text-align: center; margin: ${EMAIL_SPACING['2xl']} 0;">
            <p style="margin-bottom: ${EMAIL_SPACING.md}; color: ${EMAIL_COLORS.neutral[700]}; font-size: 14px;">Découvrez nos gâteaux disponibles ou proposez une autre date</p>
            ${EmailButton({
                href: catalogUrl,
                text: 'Voir le catalogue',
                variant: 'primary',
                shopColor,
            })}
        </div>
    `;

    const footer = EmailFooter({
        requestId,
        date,
        showOrderId: false,
        showRequestId: true,
    });

    return EmailContainer(
        `
            ${header}
            ${title}
            ${intro}
            ${reasonSection}
            ${ctaSection}
            ${footer}
        `,
        shopColor
    );
}
