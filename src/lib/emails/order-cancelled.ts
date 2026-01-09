import { EmailContainer, EmailHeader, EmailFooter, EmailTitle, EmailParagraph, EmailButton, EmailSection } from './components';
import { EMAIL_COLORS, EMAIL_SPACING } from './styles';

interface OrderCancelledProps {
    customerName: string;
    shopName: string;
    shopLogo?: string;
    orderId: string;
    orderUrl: string;
    date: string;
    chefMessage?: string;
    willRefund?: boolean;
    shopColor?: string | null;
}

export function OrderCancelledEmail({
    customerName,
    shopName,
    shopLogo,
    orderId,
    orderUrl,
    date,
    chefMessage,
    willRefund = false,
    shopColor,
}: OrderCancelledProps) {
    const header = EmailHeader({
        logoUrl: shopLogo,
        logoAlt: shopName,
        type: 'customer',
        shopColor,
    });

    const title = EmailTitle('Commande annulée');

    const intro = EmailParagraph(
        `Bonjour ${customerName},<br /><br />Votre commande a été annulée par le pâtissier. Nous vous remercions de votre compréhension.`
    );

    const refundSection = willRefund ? `
        <div style="margin: ${EMAIL_SPACING.lg} 0; padding: ${EMAIL_SPACING.lg}; border-radius: ${EMAIL_SPACING.md}; border-left: 3px solid ${shopColor || EMAIL_COLORS.accent.primary};">
            <h3 style="margin: 0 0 ${EMAIL_SPACING.sm} 0; color: ${EMAIL_COLORS.neutral[900]}; font-size: 16px; font-weight: 600;">Remboursement</h3>
            <p style="margin: 0; color: ${EMAIL_COLORS.neutral[700]}; font-size: 14px;">Votre paiement sera intégralement remboursé dans les plus brefs délais.</p>
        </div>
    ` : '';

    const chefMessageSection = chefMessage ? `
        <div style="margin: ${EMAIL_SPACING.lg} 0; padding: ${EMAIL_SPACING.lg}; border-radius: ${EMAIL_SPACING.md}; background-color: ${EMAIL_COLORS.neutral[50]};">
            <h3 style="margin: 0 0 ${EMAIL_SPACING.sm} 0; color: ${EMAIL_COLORS.neutral[900]}; font-size: 16px; font-weight: 600;">Message du pâtissier</h3>
            <p style="margin: 0; color: ${EMAIL_COLORS.neutral[700]}; font-size: 14px; white-space: pre-wrap; line-height: 160%;">${chefMessage.replace(/\n/g, '<br>')}</p>
        </div>
    ` : '';

    const ctaSection = `
        <div style="text-align: center; margin: ${EMAIL_SPACING['2xl']} 0;">
            <p style="margin-bottom: ${EMAIL_SPACING.md}; color: ${EMAIL_COLORS.neutral[700]}; font-size: 14px;">Découvrez nos autres produits disponibles</p>
            ${EmailButton({
                href: orderUrl,
                text: 'Voir le catalogue',
                variant: 'primary',
                shopColor,
            })}
        </div>
    `;

    const contactSection = willRefund ? EmailSection({
        title: 'Contact',
        children: 'Si vous avez des questions concernant le remboursement, n\'hésitez pas à contacter le pâtissier.',
    }) : '';

    const footer = EmailFooter({
        orderId,
        date,
        showOrderId: true,
        showRequestId: false,
    });

    return EmailContainer(
        `
            ${header}
            ${title}
            ${intro}
            ${refundSection}
            ${chefMessageSection}
            ${ctaSection}
            ${contactSection}
            ${footer}
        `,
        shopColor
    );
}