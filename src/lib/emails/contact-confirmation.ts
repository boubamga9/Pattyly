import { EmailContainer, EmailHeader, EmailFooter, EmailTitle, EmailParagraph, EmailSection } from './components';
import { EMAIL_SPACING, EMAIL_COLORS, EMAIL_TYPOGRAPHY } from './styles';

interface ContactConfirmationProps {
    name: string;
    subject: string;
    message: string;
}

export function ContactConfirmationEmail({ name, subject, message }: ContactConfirmationProps) {
    const header = EmailHeader({
        logoUrl: undefined,
        logoAlt: 'Pattyly',
        type: 'customer',
    });

    const title = EmailTitle('Message reçu');

    const intro = EmailParagraph(
        `Bonjour ${name},<br /><br />Nous avons bien reçu votre message et nous vous remercions de nous avoir contactés. Notre équipe vous répondra dans les plus brefs délais, généralement sous 24h.`
    );

    const summary = `
        <div style="margin: ${EMAIL_SPACING.lg} 0; padding: ${EMAIL_SPACING.lg}; border-radius: ${EMAIL_SPACING.md}; background-color: ${EMAIL_COLORS.neutral[50]}; border-left: 3px solid ${EMAIL_COLORS.neutral[300]};">
            <h3 style="margin: 0 0 ${EMAIL_SPACING.md} 0; color: ${EMAIL_COLORS.neutral[900]}; font-size: 16px; font-weight: 600;">Récapitulatif de votre message</h3>
            <p style="margin: ${EMAIL_SPACING.xs} 0; color: ${EMAIL_COLORS.neutral[700]}; font-size: 14px;"><strong style="font-weight: ${EMAIL_TYPOGRAPHY.fontWeight.medium};">Sujet :</strong> ${subject}</p>
            <p style="margin: ${EMAIL_SPACING.sm} 0 ${EMAIL_SPACING.xs} 0; color: ${EMAIL_COLORS.neutral[700]}; font-size: 14px;"><strong style="font-weight: ${EMAIL_TYPOGRAPHY.fontWeight.medium};">Message :</strong></p>
            <div style="margin-top: ${EMAIL_SPACING.sm}; padding: ${EMAIL_SPACING.md}; border-radius: ${EMAIL_SPACING.sm}; background-color: white; border: 1px solid ${EMAIL_COLORS.neutral[200]};">
                <p style="margin: 0; color: ${EMAIL_COLORS.neutral[700]}; font-size: 14px; line-height: 160%; white-space: pre-wrap;">${message}</p>
            </div>
        </div>
    `;

    const footer = `
        <div style="text-align: center; margin-top: ${EMAIL_SPACING['2xl']}; padding-top: ${EMAIL_SPACING.lg}; border-top: 1px solid ${EMAIL_COLORS.neutral[200]};">
            <p style="color: ${EMAIL_COLORS.neutral[500]}; font-size: ${EMAIL_TYPOGRAPHY.fontSize.xs};">
                Cet email a été envoyé automatiquement, merci de ne pas y répondre.
            </p>
        </div>
    `;

    return EmailContainer(
        `
            ${header}
            ${title}
            ${intro}
            ${summary}
            ${footer}
        `
    );
}
