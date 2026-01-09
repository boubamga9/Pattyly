import { formatDateTimeForEmail } from '$lib/utils/email-formatters';
import { EmailContainer, EmailHeader, EmailFooter, EmailTitle, EmailParagraph, EmailButton, EmailSection, EmailTable } from './components';

interface OrderConfirmationProps {
    customerName: string;
    shopName: string;
    shopLogo?: string;
    productName: string;
    pickupDate: string;
    pickupTime?: string | null;
    totalAmount: number;
    paidAmount: number;
    remainingAmount: number;
    orderId: string;
    orderUrl: string;
    date: string;
    shopColor?: string | null; // Couleur de la boutique pour adapter les emails
}

export function OrderConfirmationEmail({
    customerName,
    shopName,
    shopLogo,
    productName,
    pickupDate,
    pickupTime,
    totalAmount,
    paidAmount,
    remainingAmount,
    orderId,
    orderUrl,
    date,
    shopColor,
}: OrderConfirmationProps) {
    const header = EmailHeader({
        logoUrl: shopLogo,
        logoAlt: shopName,
        type: 'customer',
        shopColor,
    });

    const title = EmailTitle('Commande confirmée');

    const content = EmailParagraph(
        `Bonjour ${customerName},<br /><br />Le pâtissier a confirmé la réception de votre acompte et commence la préparation de votre commande. Votre gâteau sera prêt pour le <strong>${formatDateTimeForEmail(pickupDate, pickupTime)}</strong>.`
    );

    const details = EmailTable([
        { label: 'Gâteau', value: productName },
        { label: 'Date de retrait', value: formatDateTimeForEmail(pickupDate, pickupTime) },
        { label: 'Prix total', value: `<strong>${totalAmount.toFixed(2)}€</strong>` },
        { label: 'Acompte payé', value: `<strong>${paidAmount.toFixed(2)}€</strong>` },
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
        <div style="text-align: center; margin: 32px 0;">
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
            ${content}
            ${details}
            ${important}
            ${ctaSection}
            ${footer}
        `,
        shopColor
    );
}