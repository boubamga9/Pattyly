import { formatDateTimeForEmail } from '$lib/utils/email-formatters';
import { EmailContainer, EmailHeader, EmailFooter, EmailTitle, EmailParagraph, EmailButton, EmailTable, EmailSection } from './components';
import { EMAIL_SPACING, EMAIL_COLORS, EMAIL_TYPOGRAPHY } from './styles';

interface OrderPendingVerificationClientProps {
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
    orderRef: string;
    date: string;
    shopColor?: string | null;
}

export function OrderPendingVerificationClientEmail({
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
    orderRef,
    date,
    shopColor,
}: OrderPendingVerificationClientProps) {
    const header = EmailHeader({
        logoUrl: shopLogo,
        logoAlt: shopName,
        type: 'customer',
        shopColor,
    });

    const title = EmailTitle('Commande enregistrée');

    const intro = EmailParagraph(
        `Bonjour ${customerName},<br /><br />Votre commande a bien été envoyée au pâtissier <strong>${shopName}</strong>. Vous recevrez un email de confirmation dès que le paiement aura été vérifié et que la préparation aura commencé.`
    );

    const warning = `
        <div style="margin: ${EMAIL_SPACING.lg} 0; padding: ${EMAIL_SPACING.lg}; border-radius: ${EMAIL_SPACING.md}; border-left: 3px solid ${EMAIL_COLORS.accent.primary}; background-color: ${EMAIL_COLORS.accent.light50};">
            <h3 style="margin: 0 0 ${EMAIL_SPACING.sm} 0; color: ${EMAIL_COLORS.neutral[900]}; font-size: 16px; font-weight: 600;">En attente de vérification</h3>
            <p style="margin: 0; color: ${EMAIL_COLORS.neutral[700]}; font-size: 14px;">Le pâtissier va vérifier la réception de votre paiement sur PayPal (référence : <strong>${orderRef}</strong>) et vous confirmera le début de préparation.</p>
        </div>
    `;

    const details = EmailTable([
        { label: 'Gâteau', value: productName },
        { label: 'Date de retrait', value: formatDateTimeForEmail(pickupDate, pickupTime) },
        { label: 'Prix total', value: `<strong>${totalAmount.toFixed(2)}€</strong>` },
        { label: 'Acompte déclaré', value: `<strong>${paidAmount.toFixed(2)}€</strong>` },
        { label: 'Solde restant', value: `<strong>${remainingAmount.toFixed(2)}€</strong>` },
    ]);

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
            ${details}
            ${ctaSection}
            ${footerWithRef}
        `,
        shopColor
    );
}

