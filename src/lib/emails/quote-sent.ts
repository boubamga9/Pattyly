interface QuoteSentProps {
    customerName: string;
    shopName: string;
    shopLogo?: string;
    quoteId: string;
    orderUrl: string;
    date: string;
}

export function QuoteSentEmail({
    customerName,
    shopName,
    shopLogo,
    quoteId,
    orderUrl,
    date,
}: QuoteSentProps) {
    return `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <!-- Logo du pâtissier ou Pattyly -->
            <div style="text-align: center; margin-bottom: 30px;">
                <img
                    src="${shopLogo || `${process.env.PUBLIC_SITE_URL}/images/logo_icone.png`}"
                    alt="${shopName}"
                    style="height: 40px; margin-bottom: 10px;"
                />
                <div style="height: 1px; background-color: #e5e7eb; margin: 20px 0;"></div>
            </div>

            <div style="margin-bottom: 16px;">
                <h2 style="color: #f97316; margin-top: 0; font-size: 18px; font-weight: normal;">💰 Votre devis est prêt !</h2>
                <p>Bonjour ${customerName},</p>
                <p>Merci pour votre demande personnalisée. Voici votre devis détaillé pour votre gâteau.</p>
            </div>

            <div style="text-align: center; margin-top: 24px; padding: 16px; background-color: #f8f9fa; border-radius: 6px;">
                <h3 style="margin-top: 0; color: #333; font-size: 16px; font-weight: bold;">📋 Voir votre devis</h3>
                <p style="margin-bottom: 20px;">Retrouvez tous les détails de votre devis :</p>
                <a
                    href="${orderUrl}"
                    style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; box-shadow: 0 4px 14px 0 rgba(249, 115, 22, 0.3); transition: all 0.3s ease;"
                >
                    📄 Voir le détail du devis
                </a>
            </div>

            <div style="text-align: center; margin-top: 24px; padding-top: 16px; border-top: 1px solid #dee2e6;">
                <p style="color: #666; font-size: 14px;">
                    <strong>Numéro de devis :</strong> #${quoteId}
                </p>
                <p style="color: #999; font-size: 12px;">
                    Devis envoyé le ${date}
                </p>
            </div>
        </div>
    `;
}