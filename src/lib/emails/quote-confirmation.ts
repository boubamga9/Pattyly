import { formatDateTimeForEmail } from '$lib/utils/email-formatters';
import { EmailContainer, EmailHeader, EmailFooter, EmailTitle, EmailParagraph, EmailButton, EmailTable, EmailSection } from './components';
import { EMAIL_SPACING, EMAIL_COLORS } from './styles';

interface QuoteConfirmationProps {
    customerName: string;
    shopName: string;
    shopLogo?: string;
    pickupDate: string;
    pickupTime?: string | null;
    totalPrice: number;
    depositAmount: number;
    remainingAmount: number;
    orderId: string;
    orderUrl: string;
    date: string;
    shopColor?: string | null;
}

export function QuoteConfirmationEmail({
    customerName,
    shopName,
    shopLogo,
    pickupDate,
    pickupTime,
    totalPrice,
    depositAmount,
    remainingAmount,
    orderId,
    orderUrl,
    date,
    shopColor,
}: QuoteConfirmationProps) {
    const header = EmailHeader({
        logoUrl: shopLogo,
        logoAlt: shopName,
        type: 'customer',
        shopColor,
    });

    const title = EmailTitle('Commande confirmée');

    const intro = EmailParagraph(
        `Bonjour ${customerName},<br /><br />Votre commande personnalisée a été confirmée et votre acompte a été prélevé avec succès. Le pâtissier prépare votre gâteau pour le <strong>${formatDateTimeForEmail(pickupDate, pickupTime)}</strong>.`
    );

    const details = EmailTable([
        { label: 'Date de retrait', value: formatDateTimeForEmail(pickupDate, pickupTime) },
        { label: 'Prix total', value: `<strong>${totalPrice.toFixed(2)}€</strong>` },
        { label: 'Acompte payé', value: `<strong>${depositAmount.toFixed(2)}€</strong>` },
        { label: 'Solde restant', value: `<strong>${remainingAmount.toFixed(2)}€</strong>` },
    ]);

    const important = EmailSection({
        title: 'Important',
        children: `
            <ul style="margin: 0; padding-left: 20px; list-style: none;">
                <li style="margin-bottom: 8px;">• Le solde restant sera à régler lors du retrait</li>
                <li>• Pensez à contacter le pâtissier pour convenir du moyen de récupération</li>
            </ul>
        `,
    });

    const ctaSection = `
        <div style="text-align: center; margin: ${EMAIL_SPACING['2xl']} 0;">
            <p style="margin-bottom: ${EMAIL_SPACING.md}; color: ${EMAIL_COLORS.neutral[700]}; font-size: 14px;">Retrouvez tous les détails de votre commande</p>
            ${EmailButton({
                href: orderUrl,
                text: 'Voir le récapitulatif',
                variant: 'primary',
                shopColor,
            })}
        </div>
    `;

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
            ${details}
            ${important}
            ${ctaSection}
            ${footer}
        `,
        shopColor
    );
}