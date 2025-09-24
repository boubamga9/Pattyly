import { PUBLIC_SITE_URL } from '$env/static/public';

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
                <h2 style="color: #dc3545; margin-top: 0; font-size: 18px; font-weight: normal;">❌ Paiement échoué</h2>
                <p>Bonjour,</p>
                <p>Nous avons rencontré un problème lors du traitement de votre paiement pour votre abonnement. Votre boutique "${shopName}" a été temporairement désactivée jusqu'à la résolution du problème.</p>
            </div>

            <div style="text-align: center; margin-top: 24px; padding: 16px;">
                <a
                    href="${customerPortalUrl}"
                    style="background-color: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;"
                >
                    💳 Mettre à jour le paiement
                </a>
                <p style="margin-top: 16px; color: #666; font-size: 14px;">
                    Si le lien a expiré, vous pouvez vous rendre dans les paramètres de votre dashboard et cliquer sur le bouton "Gérez votre abonnement".
                </p>
            </div>

            <div style="background-color: #fff3cd; padding: 16px; border-radius: 6px; border-left: 4px solid #ffc107; margin: 16px 0;">
                <h3 style="margin-top: 0; color: #856404; font-size: 16px; font-weight: bold;">⚠️ Impact sur votre boutique</h3>
                <ul style="margin: 0; padding-left: 20px; color: #856404;">
                    <li>Votre boutique est temporairement inaccessible aux clients</li>
                    <li>Les nouvelles commandes sont suspendues</li>
                    <li>Vos données et commandes existantes restent en sécurité</li>
                    <li>Vous pouvez toujours accéder à votre dashboard</li>
                </ul>
            </div>

            <div style="background-color: #e7f3ff; padding: 12px; border-radius: 6px; margin: 16px 0;">
                <h3 style="margin-top: 0; color: #0066cc; font-size: 16px; font-weight: bold;">💬 Besoin d'aide ?</h3>
                <p style="margin: 0; color: #0066cc; font-size: 14px;">
                    Notre équipe support est disponible pour vous aider à résoudre ce problème. Contactez-nous si vous avez besoin d'assistance.
                </p>
            </div>

            <div style="text-align: center; margin-top: 24px; padding-top: 16px; border-top: 1px solid #dee2e6;">
                <p style="color: #666; font-size: 14px;">
                    <strong>Boutique :</strong> ${shopName}
                </p>
                <p style="color: #999; font-size: 12px;">
                    Email envoyé le ${date}
                </p>
            </div>
        </div>
    `;
}
