import { EmailContainer, EmailHeader, EmailFooter, EmailTitle, EmailParagraph, EmailButton, EmailSection } from './components';
import { EMAIL_SPACING, EMAIL_COLORS } from './styles';

interface CustomRequestConfirmationProps {
    customerName: string;
    shopName: string;
    shopLogo?: string;
    requestId: string;
    orderUrl: string;
    date: string;
    shopColor?: string | null;
}

export function CustomRequestConfirmationEmail({
    customerName,
    shopName,
    shopLogo,
    requestId,
    orderUrl,
    date,
    shopColor,
}: CustomRequestConfirmationProps) {
    const header = EmailHeader({
        logoUrl: shopLogo,
        logoAlt: shopName,
        type: 'customer',
        shopColor,
    });

    const title = EmailTitle('Demande envoyée');

    const intro = EmailParagraph(
        `Bonjour ${customerName},<br /><br />Votre demande personnalisée a été transmise à <strong>${shopName}</strong> avec succès. Le pâtissier vous enverra un devis personnalisé très prochainement.`
    );

    const ctaSection = `
        <div style="text-align: center; margin: ${EMAIL_SPACING['2xl']} 0;">
            <p style="margin-bottom: ${EMAIL_SPACING.md}; color: ${EMAIL_COLORS.neutral[700]}; font-size: 14px;">Retrouvez tous les détails de votre demande</p>
            ${EmailButton({
                href: orderUrl,
                text: 'Voir le récapitulatif',
                variant: 'primary',
                shopColor,
            })}
        </div>
    `;

    const nextSteps = EmailSection({
        title: 'Prochaines étapes',
        children: `
            <ol style="margin: 0; padding-left: 20px; list-style: decimal; color: ${EMAIL_COLORS.neutral[700]};">
                <li style="margin-bottom: 8px;">Le pâtissier étudie votre demande</li>
                <li style="margin-bottom: 8px;">Vous recevrez un devis personnalisé par email</li>
                <li style="margin-bottom: 8px;">Vous pourrez accepter ou refuser le devis</li>
                <li>En cas d'acceptation, vous effectuerez un acompte</li>
            </ol>
        `,
    });

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
            ${ctaSection}
            ${nextSteps}
            ${footer}
        `,
        shopColor
    );
}
