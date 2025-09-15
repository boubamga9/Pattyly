import { PUBLIC_SITE_URL } from '$env/static/public';

interface ContactConfirmationProps {
    name: string;
    subject: string;
    message: string;
}

export function ContactConfirmationEmail({ name, subject, message }: ContactConfirmationProps) {
    return `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <!-- Logo Pattyly -->
            <div style="text-align: center; margin-bottom: 30px;">
                <img
                    src="${PUBLIC_SITE_URL}/images/logo_icone.png"
                    alt="Pattyly"
                    style="height: 40px; margin-bottom: 10px;"
                />
                <div style="height: 1px; background-color: #e5e7eb; margin: 20px 0;"></div>
            </div>

            <div style="margin-bottom: 16px;">
                <h2 style="color: #f97316; margin-top: 0; font-size: 18px; font-weight: normal;">✅ Message reçu !</h2>
                <p>Bonjour ${name},</p>
                <p>Nous avons bien reçu votre message et nous vous remercions de nous avoir contactés.</p>
                <p style="margin-bottom: 24px;">Notre équipe vous répondra dans les plus brefs délais, généralement sous 24h.</p>
            </div>

            <div style="background-color: #f8f9fa; padding: 12px; border-radius: 6px; border-left: 3px solid #e5e7eb;">
                <h3 style="margin-top: 0; color: #333; font-size: 16px; font-weight: bold;">📝 Récapitulatif de votre message</h3>
                <p><span style="font-weight: 600;">Sujet :</span> ${subject}</p>
                <p><span style="font-weight: 600;">Message :</span></p>
                <div style="background-color: white; padding: 12px; border-radius: 4px; border: 1px solid #dee2e6;">
                    ${message}
                </div>
            </div>

            <div style="text-align: center; margin-top: 24px; padding-top: 16px; border-top: 1px solid #dee2e6;">
                <p style="color: #999; font-size: 12px;">
                    Cet email a été envoyé automatiquement, merci de ne pas y répondre.
                </p>
            </div>
        </div>
    `;
}
