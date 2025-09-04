interface RequestRejectedProps {
    customerName: string;
    shopName: string;
    shopLogo?: string;
    reason?: string;
    requestId: string;
    catalogUrl: string;
    date: string;
}

export function RequestRejectedEmail({
    customerName,
    shopName,
    shopLogo,
    reason,
    requestId,
    catalogUrl,
    date
}: RequestRejectedProps) {
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
                <h2 style="color: #f97316; margin-top: 0; font-size: 18px; font-weight: normal;">❌ Demande refusée</h2>
                <p>Bonjour ${customerName},</p>
                <p style="margin-bottom: 24px;">Malheureusement, nous ne pouvons pas honorer votre demande pour cette date.</p>
            </div>

            ${reason ? `
            <div style="background-color: #f8f9fa; padding: 16px; border-radius: 6px; margin: 16px 0;">
                <h3 style="margin-top: 0; color: #333; font-size: 16px; font-weight: bold;">Raisons du refus</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; font-weight: 600; width: 120px;">Raison :</td>
                        <td style="padding: 8px 0;">${reason}</td>
                    </tr>
                </table>
            </div>
            ` : ''}

            <div style="text-align: center; margin-top: 24px; padding: 16px; background-color: #f8f9fa; border-radius: 6px;">
                <h3 style="margin-top: 0; color: #333; font-size: 16px; font-weight: bold;">🔄 Alternatives</h3>
                <p style="margin-bottom: 20px;">Découvrez nos gâteaux disponibles ou proposez une autre date :</p>
                <a
                    href="${catalogUrl}"
                    style="background-color: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;"
                >
                    🍰 Voir le catalogue
                </a>
            </div>

            <div style="text-align: center; margin-top: 24px; padding-top: 16px; border-top: 1px solid #dee2e6;">
                <p style="color: #666; font-size: 14px;">
                    <strong>Numéro de demande :</strong> #${requestId}
                </p>
                <p style="color: #999; font-size: 12px;">
                    Demande refusée le ${date}
                </p>
            </div>
        </div>
    `;
}
