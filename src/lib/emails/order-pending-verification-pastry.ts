import { formatDateTimeForEmail } from '$lib/utils/email-formatters';
import { EmailContainer, EmailHeader, EmailFooter, EmailTitle, EmailParagraph, EmailButton, EmailTable } from './components';
import { EMAIL_SPACING, EMAIL_COLORS, EMAIL_TYPOGRAPHY } from './styles';

interface OrderPendingVerificationPastryProps {
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
    orderRef: string;
    dashboardUrl: string;
    date: string;
}

export function OrderPendingVerificationPastryEmail({
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
    orderRef,
    dashboardUrl,
    date,
}: OrderPendingVerificationPastryProps) {
    const header = EmailHeader({
        logoUrl: undefined,
        logoAlt: 'Pattyly',
        type: 'pastry',
    });

    const title = EmailTitle('Nouvelle commande - Action requise');

    const intro = EmailParagraph(
        `Vous avez reçu une nouvelle commande de <strong>${customerName}</strong>.<br /><br /><strong>Veuillez vérifier le paiement sur PayPal avant de commencer la préparation.</strong>`
    );

    const warning = `
        <div style="margin: ${EMAIL_SPACING.lg} 0; padding: ${EMAIL_SPACING.lg}; border-radius: ${EMAIL_SPACING.md}; border-left: 3px solid ${EMAIL_COLORS.accent.primary}; background-color: ${EMAIL_COLORS.accent.light50};">
            <h3 style="margin: 0 0 ${EMAIL_SPACING.md} 0; color: ${EMAIL_COLORS.neutral[900]}; font-size: 16px; font-weight: 600;">Vérification du paiement PayPal</h3>
            <ol style="margin: 0; padding-left: 20px; list-style: decimal; color: ${EMAIL_COLORS.neutral[700]};">
                <li style="margin-bottom: ${EMAIL_SPACING.sm};">Connectez-vous à votre compte PayPal</li>
                <li style="margin-bottom: ${EMAIL_SPACING.sm};">Recherchez un paiement de <strong>${paidAmount.toFixed(2)}€</strong> avec la référence : <code style="font-family: monospace; background-color: white; padding: 4px 8px; border-radius: 4px; font-size: 13px;">${orderRef}</code></li>
                <li>Une fois vérifié, validez la commande sur votre dashboard Pattyly</li>
            </ol>
        </div>
    `;

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
        { label: 'Acompte à vérifier', value: `<strong>${paidAmount.toFixed(2)}€</strong>` },
        { label: 'Solde restant', value: `<strong>${remainingAmount.toFixed(2)}€</strong>` },
    ]);

    const ctaSection = `
        <div style="text-align: center; margin: ${EMAIL_SPACING['2xl']} 0;">
            <p style="margin-bottom: ${EMAIL_SPACING.md}; color: ${EMAIL_COLORS.neutral[700]}; font-size: 14px;">Une fois le paiement vérifié sur PayPal, validez-le sur votre dashboard</p>
            ${EmailButton({
                href: dashboardUrl,
                text: 'Valider le paiement',
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

    // Ajouter orderRef au footer
    const footerWithRef = footer.replace(
        '</div>',
        `<p style="color: ${EMAIL_COLORS.neutral[600]}; font-size: ${EMAIL_TYPOGRAPHY.fontSize.sm}; margin: ${EMAIL_SPACING.xs} 0;"><strong style="font-weight: ${EMAIL_TYPOGRAPHY.fontWeight.medium};">Référence de paiement :</strong> ${orderRef}</p></div>`
    );

    return EmailContainer(
        `
            ${header}
            ${title}
            ${intro}
            ${warning}
            ${customerInfo}
            ${orderDetails}
            ${ctaSection}
            ${footerWithRef}
        `
    );
}

