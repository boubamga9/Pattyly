import { formatDateTimeForEmail, generateInstagramEmailRow } from '$lib/utils/email-formatters';
import { EmailContainer, EmailHeader, EmailFooter, EmailTitle, EmailParagraph, EmailButton, EmailTable } from './components';
import { EMAIL_SPACING, EMAIL_COLORS, EMAIL_TYPOGRAPHY } from './styles';

interface OrderNotificationProps {
    customerName: string;
    customerEmail: string;
    customerInstagram?: string;
    productName: string;
    pickupDate: string;
    pickupTime?: string | null;
    totalAmount: number;
    paidAmount: number;
    remainingAmount: number;
    orderId: string;
    dashboardUrl: string;
    date: string;
}

export function OrderNotificationEmail({
    customerName,
    customerEmail,
    customerInstagram,
    productName,
    pickupDate,
    pickupTime,
    totalAmount,
    paidAmount,
    remainingAmount,
    orderId,
    dashboardUrl,
    date,
}: OrderNotificationProps) {
    const header = EmailHeader({
        logoUrl: undefined,
        logoAlt: 'Pattyly',
        type: 'pastry',
    });

    const title = EmailTitle('Nouvelle commande reçue');

    const intro = EmailParagraph(
        `Vous avez reçu une nouvelle commande de <strong>${customerName}</strong>.<br /><br />Action requise : Préparer le gâteau pour le <strong>${formatDateTimeForEmail(pickupDate, pickupTime)}</strong>.`
    );

    const customerInfoRows = [
        { label: 'Nom', value: customerName },
        { label: 'Email', value: `<a href="mailto:${customerEmail}" style="color: ${EMAIL_COLORS.accent.primary};">${customerEmail}</a>` },
    ];
    if (customerInstagram) {
        customerInfoRows.push({ label: 'Instagram', value: `<a href="https://instagram.com/${customerInstagram.replace('@', '')}" style="color: ${EMAIL_COLORS.accent.primary};">${customerInstagram}</a>` });
    }
    const customerInfo = EmailTable(customerInfoRows);

    const orderDetails = EmailTable([
        { label: 'Gâteau', value: productName },
        { label: 'Date de retrait', value: formatDateTimeForEmail(pickupDate, pickupTime) },
        { label: 'Prix total', value: `<strong>${totalAmount.toFixed(2)}€</strong>` },
        { label: 'Acompte reçu', value: `<strong>${paidAmount.toFixed(2)}€</strong>` },
        { label: 'Solde restant', value: `<strong>${remainingAmount.toFixed(2)}€</strong>` },
    ]);

    const ctaSection = `
        <div style="text-align: center; margin: ${EMAIL_SPACING['2xl']} 0;">
            <p style="margin-bottom: ${EMAIL_SPACING.md}; color: ${EMAIL_COLORS.neutral[700]}; font-size: 14px;">Connectez-vous à votre dashboard pour gérer cette commande</p>
            ${EmailButton({
                href: dashboardUrl,
                text: 'Accéder au dashboard',
                variant: 'primary',
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
            ${customerInfo}
            ${orderDetails}
            ${ctaSection}
            ${footer}
        `
    );
}