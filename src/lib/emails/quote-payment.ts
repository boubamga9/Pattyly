import { formatDateTimeForEmail } from '$lib/utils/email-formatters';
import { EmailContainer, EmailHeader, EmailFooter, EmailTitle, EmailParagraph, EmailButton, EmailTable } from './components';
import { EMAIL_SPACING, EMAIL_COLORS } from './styles';

interface QuotePaymentProps {
    customerName: string;
    customerEmail: string;
    pickupDate: string;
    pickupTime?: string | null;
    totalPrice: number;
    depositAmount: number;
    remainingAmount: number;
    orderId: string;
    dashboardUrl: string;
    date: string;
}

export function QuotePaymentEmail({
    customerName,
    customerEmail,
    pickupDate,
    pickupTime,
    totalPrice,
    depositAmount,
    remainingAmount,
    orderId,
    dashboardUrl,
    date,
}: QuotePaymentProps) {
    const header = EmailHeader({
        logoUrl: undefined,
        logoAlt: 'Pattyly',
        type: 'pastry',
    });

    const title = EmailTitle('Paiement reçu');

    const intro = EmailParagraph(
        `Le client <strong>${customerName}</strong> a accepté votre devis et effectué le paiement de l'acompte.<br /><br />Vous pouvez maintenant commencer la préparation de son gâteau.`
    );

    const customerInfo = EmailTable([
        { label: 'Nom', value: customerName },
        { label: 'Email', value: `<a href="mailto:${customerEmail}" style="color: ${EMAIL_COLORS.accent.primary};">${customerEmail}</a>` },
    ]);

    const orderDetails = EmailTable([
        { label: 'Date de retrait', value: formatDateTimeForEmail(pickupDate, pickupTime) },
    ]);

    const financialDetails = EmailTable([
        { label: 'Prix total', value: `<strong>${totalPrice.toFixed(2)}€</strong>` },
        { label: 'Acompte reçu', value: `<strong>${depositAmount.toFixed(2)}€</strong>` },
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
            ${financialDetails}
            ${ctaSection}
            ${footer}
        `
    );
}