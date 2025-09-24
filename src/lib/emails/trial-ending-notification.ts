import { PUBLIC_SITE_URL } from '$env/static/public';

interface TrialEndingNotificationProps {
    shopName: string;
    customerPortalUrl: string;
    date: string;
}

export function TrialEndingNotificationEmail({
    shopName,
    customerPortalUrl,
    date
}: TrialEndingNotificationProps) {
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
                <h2 style="color: #f97316; margin-top: 0; font-size: 18px; font-weight: normal;">⏰ Votre période d'essai se termine bientôt</h2>
                <p>Bonjour,</p>
                <p>Votre période d'essai gratuite de 7 jours se termine dans <strong>3 jours</strong>.</p>
                <p style="margin-bottom: 24px;">Pour continuer à utiliser votre boutique "${shopName}" et recevoir des commandes, vous devez choisir un plan d'abonnement.</p>
            </div>
            
            <div style="text-align: center; margin-top: 24px; padding: 16px;">
                <a
                    href="${customerPortalUrl}"
                    style="background-color: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;"
                >
                    ⚙️ Gérer mon compte
                </a>
                <p style="margin-top: 16px; color: #666; font-size: 14px;">
                    Si le lien a expiré, vous pouvez vous rendre dans les paramètres de votre dashboard et cliquer sur le bouton "Gérez votre abonnement".
                </p>
            </div>

            <div style="background-color: #fff3cd; padding: 16px; border-radius: 6px; border-left: 4px solid #ffc107; margin: 16px 0;">
                <h3 style="margin-top: 0; color: #856404; font-size: 16px; font-weight: bold;">⚠️ Que se passe-t-il après l'expiration ?</h3>
                <ul style="margin: 0; padding-left: 20px; color: #856404;">
                    <li>Votre boutique sera temporairement désactivée</li>
                    <li>Les clients ne pourront plus passer de commandes</li>
                    <li>Vous perdrez l'accès aux fonctionnalités Premium</li>
                    <li>Vos données seront conservées en sécurité</li>
                </ul>
            </div>

            <div style="background-color: #f8f9fa; padding: 16px; border-radius: 6px; margin: 16px 0;">
                <h3 style="margin-top: 0; color: #333; font-size: 16px; font-weight: bold;">💡 Nos plans d'abonnement</h3>
                <div style="display: flex; justify-content: space-between; margin: 16px 0;">
                    <div style="flex: 1; margin-right: 16px; padding: 12px; background-color: white; border-radius: 6px; border: 1px solid #dee2e6;">
                        <h4 style="margin: 0 0 8px 0; color: #333; font-size: 14px; font-weight: bold;">Basic - 14,99€/mois</h4>
                        <ul style="margin: 0; padding-left: 16px; font-size: 12px; color: #666;">
                            <li>Jusqu'à 10 produits</li>
                            <li>Boutique en ligne</li>
                            <li>Gestion des commandes</li>
                        </ul>
                    </div>
                    <div style="flex: 1; margin-left: 16px; padding: 12px; background-color: #f97316; color: white; border-radius: 6px;">
                        <h4 style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold;">Premium - 19,99€/mois</h4>
                        <ul style="margin: 0; padding-left: 16px; font-size: 12px;">
                            <li>Produits illimités</li>
                            <li>Demandes personnalisées</li>
                            <li>Toutes les fonctionnalités</li>
                        </ul>
                    </div>
                </div>
            </div>


            <div style="background-color: #e7f3ff; padding: 12px; border-radius: 6px; margin: 16px 0;">
                <h3 style="margin-top: 0; color: #0066cc; font-size: 16px; font-weight: bold;">💬 Besoin d'aide ?</h3>
                <p style="margin: 0; color: #0066cc; font-size: 14px;">
                    Notre équipe est là pour vous accompagner. N'hésitez pas à nous contacter si vous avez des questions sur nos plans ou si vous rencontrez des difficultés.
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
