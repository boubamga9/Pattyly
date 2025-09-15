import { PUBLIC_SITE_URL } from '$env/static/public';

interface ContactNotificationProps {
    name: string;
    email: string;
    subject: string;
    message: string;
    date: string;
}

export function ContactNotificationEmail({ name, email, subject, message, date }: ContactNotificationProps) {
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
                <h2 style="color: #f97316; margin-top: 0; font-size: 18px; font-weight: normal;">📧 Nouveau message de contact</h2>
                <p style="margin-bottom: 24px;">Un nouveau message a été envoyé via le formulaire de contact.</p>
            </div>

            <div style="background-color: #f8f9fa; padding: 16px; border-radius: 6px; margin: 16px 0;">
                <h3 style="margin-top: 0; color: #333; font-size: 16px; font-weight: bold;">👤 Informations du contact</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; font-weight: 600; width: 120px;">Nom :</td>
                        <td style="padding: 8px 0;">${name}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; font-weight: 600;">Email :</td>
                        <td style="padding: 8px 0;">
                            <a href="mailto:${email}" style="color: #f97316;">${email}</a>
                        </td>
                    </tr>
                    
                    <tr>
                        <td style="padding: 8px 0; font-weight: 600;">Sujet :</td>
                        <td style="padding: 8px 0;">${subject}</td>
                    </tr>
                </table>
            </div>

            <div style="background-color: #f8f9fa; padding: 16px; border-radius: 6px; border-left: 3px solid #e5e7eb;">
                <h3 style="margin-top: 0; color: #333; font-size: 16px; font-weight: bold;">💬 Message</h3>
                <div style="background-color: white; padding: 12px; border-radius: 4px; border: 1px solid #dee2e6;">
                    ${message}
                </div>
            </div>

            <div style="text-align: center; margin-top: 24px; padding-top: 16px; border-top: 1px solid #dee2e6;">
                <p style="color: #666; font-size: 14px;">
                    <strong>Action recommandée :</strong> Répondre dans les 24h
                </p>
                <p style="color: #999; font-size: 12px;">
                    Reçu le ${date}
                </p>
            </div>
        </div>
    `;
}
