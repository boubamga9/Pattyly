import { EmailContainer, EmailHeader, EmailTitle, EmailParagraph, EmailButton, EmailSection } from './components';
import { EMAIL_SPACING, EMAIL_COLORS, EMAIL_TYPOGRAPHY } from './styles';

interface PaymentFailedNotificationProps {
    shopName: string;
    customerPortalUrl: string;
    date: string;
}

export function PaymentFailedNotificationEmail({
    shopName,
    customerPortalUrl,
    date
}: PaymentFailedNotificationProps) {
    const header = EmailHeader({
        logoUrl: undefined,
        logoAlt: 'Pattyly',
        type: 'pastry',
    });

    const title = EmailTitle('Paiement échoué');

    const intro = EmailParagraph(
        `Bonjour,<br /><br />Nous avons rencontré un problème lors du traitement de votre paiement pour votre abonnement.`
    );

    const ctaSection = `
        <div style="text-align: center; margin: ${EMAIL_SPACING['2xl']} 0;">
            ${EmailButton({
                href: customerPortalUrl,
                text: 'Mettre à jour le paiement',
                variant: 'primary',
            })}
            <p style="margin-top: ${EMAIL_SPACING.lg}; color: ${EMAIL_COLORS.neutral[600]}; font-size: ${EMAIL_TYPOGRAPHY.fontSize.sm};">
                Si le lien a expiré, vous pouvez vous rendre dans les paramètres de votre dashboard et cliquer sur le bouton "Gérez votre abonnement".
            </p>
        </div>
    `;

    const impact = EmailSection({
        title: 'Impact sur votre boutique',
        children: `
            <ul style="margin: 0; padding-left: 20px; list-style: none; color: ${EMAIL_COLORS.neutral[700]};">
                <li style="margin-bottom: ${EMAIL_SPACING.sm};">• <strong>Les nouvelles commandes risquent d'être bloquées</strong> - Si votre limite mensuelle est atteinte, vous ne pourrez plus recevoir de commandes</li>
                <li style="margin-bottom: ${EMAIL_SPACING.sm};">• <strong>Votre visibilité dans l'annuaire risque de baisser</strong> - Les boutiques avec abonnement actif sont mises en avant</li>
                <li style="margin-bottom: ${EMAIL_SPACING.sm};">• <strong>Votre badge vérifié sera perdu</strong> - Le badge vérifié est réservé aux abonnements actifs (Starter et Premium)</li>
                <li style="margin-bottom: ${EMAIL_SPACING.sm};">• Vos données et commandes existantes restent en sécurité</li>
                <li>• Vous pouvez toujours accéder à votre dashboard</li>
            </ul>
        `,
    });

    const helpSection = `
        <div style="margin: ${EMAIL_SPACING.lg} 0; padding: ${EMAIL_SPACING.lg}; border-radius: ${EMAIL_SPACING.md}; background-color: ${EMAIL_COLORS.neutral[50]}; border-left: 3px solid ${EMAIL_COLORS.accent.primary};">
            <h3 style="margin: 0 0 ${EMAIL_SPACING.sm} 0; color: ${EMAIL_COLORS.neutral[900]}; font-size: 16px; font-weight: 600;">Besoin d'aide ?</h3>
            <p style="margin: 0; color: ${EMAIL_COLORS.neutral[700]}; font-size: 14px;">Notre équipe support est disponible pour vous aider à résoudre ce problème. Contactez-nous si vous avez besoin d'assistance.</p>
        </div>
    `;

    const footer = `
        <div style="text-align: center; margin-top: ${EMAIL_SPACING['2xl']}; padding-top: ${EMAIL_SPACING.lg}; border-top: 1px solid ${EMAIL_COLORS.neutral[200]};">
            <p style="color: ${EMAIL_COLORS.neutral[600]}; font-size: ${EMAIL_TYPOGRAPHY.fontSize.sm}; margin: ${EMAIL_SPACING.xs} 0;"><strong style="font-weight: ${EMAIL_TYPOGRAPHY.fontWeight.medium};">Boutique :</strong> ${shopName}</p>
            <p style="color: ${EMAIL_COLORS.neutral[500]}; font-size: ${EMAIL_TYPOGRAPHY.fontSize.xs}; margin-top: ${EMAIL_SPACING.sm};">
                Email envoyé le ${date}
            </p>
        </div>
    `;

    return EmailContainer(
        `
            ${header}
            ${title}
            ${intro}
            ${ctaSection}
            ${impact}
            ${helpSection}
            ${footer}
        `
    );
}
