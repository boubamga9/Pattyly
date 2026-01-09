import { formatDateTimeForEmail } from '$lib/utils/email-formatters';
import { EmailContainer, EmailHeader, EmailFooter, EmailTitle, EmailParagraph, EmailButton, EmailTable } from './components';
import { EMAIL_SPACING, EMAIL_COLORS } from './styles';

interface CustomRequestNotificationProps {
    customerName: string;
    customerEmail: string;
    customerInstagram?: string;
    pickupDate: string;
    pickupTime?: string | null;
    requestId: string;
    dashboardUrl: string;
    date: string;
}

export function CustomRequestNotificationEmail({
    customerName,
    customerEmail,
    customerInstagram,
    pickupDate,
    pickupTime,
    requestId,
    dashboardUrl,
    date
}: CustomRequestNotificationProps) {
    const header = EmailHeader({
        logoUrl: undefined,
        logoAlt: 'Pattyly',
        type: 'pastry',
    });

    const title = EmailTitle('Nouvelle demande personnalisée');

    const intro = EmailParagraph(
        `Vous avez reçu une nouvelle demande personnalisée de <strong>${customerName}</strong>.<br /><br />Action requise : Envoyer un devis sous 24-48h.`
    );

    const customerInfoRows = [
        { label: 'Nom', value: customerName },
        { label: 'Email', value: `<a href="mailto:${customerEmail}" style="color: ${EMAIL_COLORS.accent.primary};">${customerEmail}</a>` },
    ];
    if (customerInstagram) {
        customerInfoRows.push({ label: 'Instagram', value: `<a href="https://instagram.com/${customerInstagram.replace('@', '')}" style="color: ${EMAIL_COLORS.accent.primary};">${customerInstagram}</a>` });
    }
    const customerInfo = EmailTable(customerInfoRows);

    const requestDetails = EmailTable([
        { label: 'Date souhaitée', value: formatDateTimeForEmail(pickupDate, pickupTime) },
    ]);

    const ctaSection = `
        <div style="text-align: center; margin: ${EMAIL_SPACING['2xl']} 0;">
            <p style="margin-bottom: ${EMAIL_SPACING.md}; color: ${EMAIL_COLORS.neutral[700]}; font-size: 14px;">Connectez-vous à votre dashboard pour envoyer un devis</p>
            ${EmailButton({
                href: dashboardUrl,
                text: 'Accéder au dashboard',
                variant: 'primary',
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
            ${customerInfo}
            ${requestDetails}
            ${ctaSection}
            ${footer}
        `
    );
}
