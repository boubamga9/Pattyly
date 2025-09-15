import { PUBLIC_SITE_URL } from '$env/static/public';

interface CustomRequestConfirmationProps {
    customerName: string;
    shopName: string;
    shopLogo?: string;
    requestId: string;
    orderUrl: string;
    date: string;
}

export function CustomRequestConfirmationEmail({
    customerName,
    shopName,
    shopLogo,
    requestId,
    orderUrl,
    date,
}: CustomRequestConfirmationProps) {
    return `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <!-- Logo du pâtissier ou Pattyly -->
            <div style="text-align: center; margin-bottom: 30px;">
                <img
                    src="${shopLogo || `${PUBLIC_SITE_URL}/images/logo_icone.png`}"
                    alt="${shopName}"
                    style="height: 40px; margin-bottom: 10px;"
                />
                <div style="height: 1px; background-color: #e5e7eb; margin: 20px 0;"></div>
            </div>

            <div style="margin-bottom: 16px;">
                <h2 style="color: #f97316; margin-top: 0; font-size: 18px; font-weight: normal;">✅ Demande envoyée !</h2>
                <p>Bonjour ${customerName},</p>
                <p>Votre demande personnalisée a été transmise à ${shopName} avec succès.</p>
                <p style="margin-bottom: 24px;">Le pâtissier vous enverra un devis personnalisé très prochainement.</p>
            </div>

            <div style="text-align: center; margin-top: 24px; padding: 16px; background-color: #f8f9fa; border-radius: 6px;">
                <h3 style="margin-top: 0; color: #333; font-size: 16px; font-weight: bold;">📋 Voir le récapitulatif de ma demande</h3>
                <p style="margin-bottom: 20px;">Retrouvez tous les détails de votre demande :</p>
                <a
                    href="${orderUrl}"
                    style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; box-shadow: 0 4px 14px 0 rgba(249, 115, 22, 0.3); transition: all 0.3s ease;"
                >
                    📄 Voir le récapitulatif de ma demande
                </a>
            </div>

            <div style="background-color: #f8f9fa; padding: 12px; border-radius: 6px; margin: 16px 0;">
                <h3 style="margin-top: 0; color: #333; font-size: 16px; font-weight: bold;">⏰ Prochaines étapes</h3>
                <ol style="margin: 0; padding-left: 20px;">
                    <li>Le pâtissier étudie votre demande</li>
                    <li>Vous recevrez un devis personnalisé par email</li>
                    <li>Vous pourrez accepter ou refuser le devis</li>
                    <li>En cas d'acceptation, vous effectuerez un acompte</li>
                </ol>
            </div>

            <div style="text-align: center; margin-top: 24px; padding-top: 16px; border-top: 1px solid #dee2e6;">
                <p style="color: #666; font-size: 14px;">
                    <strong>Numéro de demande :</strong> #${requestId}
                </p>
                <p style="color: #999; font-size: 12px;">
                    Envoyé le ${date}
                </p>
            </div>
        </div>
    `;
}
