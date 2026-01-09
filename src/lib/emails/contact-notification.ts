import { EmailContainer, EmailHeader, EmailTitle, EmailParagraph, EmailTable, EmailSection } from './components';
import { EMAIL_SPACING, EMAIL_COLORS, EMAIL_TYPOGRAPHY } from './styles';

interface ContactNotificationProps {
    name: string;
    email: string;
    subject: string;
    message: string;
    date: string;
}

export function ContactNotificationEmail({ name, email, subject, message, date }: ContactNotificationProps) {
    const header = EmailHeader({
        logoUrl: undefined,
        logoAlt: 'Pattyly',
        type: 'pastry',
    });

    const title = EmailTitle('Nouveau message de contact');

    const intro = EmailParagraph(
        `Un nouveau message a été envoyé via le formulaire de contact.`
    );

    const contactInfo = EmailTable([
        { label: 'Nom', value: name },
        { label: 'Email', value: `<a href="mailto:${email}" style="color: ${EMAIL_COLORS.accent.primary};">${email}</a>` },
        { label: 'Sujet', value: subject },
    ]);

    const messageSection = `
        <div style="margin: ${EMAIL_SPACING.lg} 0; padding: ${EMAIL_SPACING.lg}; border-radius: ${EMAIL_SPACING.md}; background-color: ${EMAIL_COLORS.neutral[50]}; border-left: 3px solid ${EMAIL_COLORS.neutral[300]};">
            <h3 style="margin: 0 0 ${EMAIL_SPACING.md} 0; color: ${EMAIL_COLORS.neutral[900]}; font-size: 16px; font-weight: 600;">Message</h3>
            <div style="margin-top: ${EMAIL_SPACING.sm}; padding: ${EMAIL_SPACING.md}; border-radius: ${EMAIL_SPACING.sm}; background-color: white; border: 1px solid ${EMAIL_COLORS.neutral[200]};">
                <p style="margin: 0; color: ${EMAIL_COLORS.neutral[700]}; font-size: 14px; line-height: 160%; white-space: pre-wrap;">${message}</p>
            </div>
        </div>
    `;

    const footer = `
        <div style="text-align: center; margin-top: ${EMAIL_SPACING['2xl']}; padding-top: ${EMAIL_SPACING.lg}; border-top: 1px solid ${EMAIL_COLORS.neutral[200]};">
            <p style="color: ${EMAIL_COLORS.neutral[600]}; font-size: ${EMAIL_TYPOGRAPHY.fontSize.sm}; margin: ${EMAIL_SPACING.xs} 0;"><strong style="font-weight: ${EMAIL_TYPOGRAPHY.fontWeight.medium};">Action recommandée :</strong> Répondre dans les 24h</p>
            <p style="color: ${EMAIL_COLORS.neutral[500]}; font-size: ${EMAIL_TYPOGRAPHY.fontSize.xs}; margin-top: ${EMAIL_SPACING.sm};">
                Reçu le ${date}
            </p>
        </div>
    `;

    return EmailContainer(
        `
            ${header}
            ${title}
            ${intro}
            ${contactInfo}
            ${messageSection}
            ${footer}
        `
    );
}
