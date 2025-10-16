import { PUBLIC_SITE_URL } from '$env/static/public';
import { formatDateTimeForEmail } from '$lib/utils/email-formatters';

interface OrderConfirmationProps {
    customerName: string;
    shopName: string;
    shopLogo?: string;
    productName: string;
    pickupDate: string;
    pickupTime?: string | null;
    totalAmount: number;
    paidAmount: number;
    remainingAmount: number;
    orderId: string;
    orderUrl: string;
    date: string;
}

export function OrderConfirmationEmail({
    customerName,
    shopName,
    shopLogo,
    productName,
    pickupDate,
    pickupTime,
    totalAmount,
    paidAmount,
    remainingAmount,
    orderId,
    orderUrl,
    date,
}: OrderConfirmationProps) {
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
                <h2 style="color: #f97316; margin-top: 0; font-size: 18px; font-weight: normal;">✅ Commande confirmée !</h2>
                <p>Bonjour ${customerName},</p>
                <p>Le pâtissier a confirmé la réception de votre acompte et commence la préparation de votre commande.</p>
                <p style="margin-bottom: 24px;">Votre gâteau sera prêt pour le ${formatDateTimeForEmail(pickupDate, pickupTime)}.</p>
            </div>

            <div style="background-color: #f8f9fa; padding: 16px; border-radius: 6px; margin: 16px 0;">
                <h3 style="margin-top: 0; color: #333; font-size: 16px; font-weight: bold;">📋 Détails de votre commande</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; font-weight: 600; width: 120px;">Gâteau :</td>
                        <td style="padding: 8px 0;">${productName}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; font-weight: 600;">Date de retrait :</td>
                        <td style="padding: 8px 0;">${formatDateTimeForEmail(pickupDate, pickupTime)}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; font-weight: 600;">Prix total :</td>
                        <td style="padding: 8px 0;"><strong>${totalAmount}€</strong></td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; font-weight: 600;">Acompte payé :</td>
                        <td style="padding: 8px 0;"><strong style="color: #28a745;">${paidAmount}€</strong></td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; font-weight: 600;">Solde restant :</td>
                        <td style="padding: 8px 0;"><strong style="color: #dc3545;">${remainingAmount}€</strong></td>
                    </tr>
                </table>
            </div>



            <div style="background-color: #f8f9fa; padding: 12px; border-radius: 6px; margin: 16px 0;">
                <h3 style="margin-top: 0; color: #333; font-size: 16px; font-weight: bold;">💡 Important</h3>
                <ul style="margin: 0; padding-left: 20px;">
                    <li>Le solde restant sera à régler lors du retrait</li>
                    <li>Pensez à contacter le pâtissier pour convenir d'une heure de retrait</li>
                    
                </ul>
            </div>

            <div style="text-align: center; margin-top: 24px; padding: 16px; background-color: #f8f9fa; border-radius: 6px;">
                <h3 style="margin-top: 0; color: #333; font-size: 16px; font-weight: bold;">📋 Voir votre commande</h3>
                <p style="margin-bottom: 20px;">Retrouvez tous les détails de votre commande :</p>
                <a
                    href="${orderUrl}"
                    style="background-color: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;"
                >
                    📄 Voir le récapitulatif
                </a>
            </div>

            <div style="text-align: center; margin-top: 24px; padding-top: 16px; border-top: 1px solid #dee2e6;">
                <p style="color: #666; font-size: 14px;">
                    <strong>Numéro de commande :</strong> #${orderId}
                </p>
                <p style="color: #999; font-size: 12px;">
                    Commande confirmée le ${date}
                </p>
            </div>
        </div>
    `;
}