import { formatDateTimeForEmail } from '$lib/utils/email-formatters';
import { EmailContainer, EmailHeader, EmailFooter, EmailTitle, EmailParagraph, EmailButton, EmailSection, EmailTable } from './components';

interface OrderReadyProps {
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

export function OrderReadyEmail({
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
}: OrderReadyProps) {
    const header = EmailHeader({
        logoUrl: shopLogo,
        logoAlt: shopName,
        type: 'customer',
        shopColor,
    });

    const title = EmailTitle('Votre commande est prête ! 🎉');

    const content = EmailParagraph(
        `Bonjour ${customerName},<br /><br />Excellente nouvelle ! Votre commande est prête et vous pouvez venir la récupérer. Votre gâteau vous attend pour le <strong>${formatDateTimeForEmail(pickupDate, pickupTime)}</strong>.`
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
                <li>• N'oubliez pas de régler le solde restant lors du retrait</li>
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
