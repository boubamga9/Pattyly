import { Resend } from 'resend';
import { env } from '$env/dynamic/private';

// Templates d'emails
import { OrderConfirmationEmail } from '$lib/emails/order-confirmation';
import { OrderNotificationEmail } from '$lib/emails/order-notification';
import { OrderPendingVerificationClientEmail } from '$lib/emails/order-pending-verification-client';
import { OrderPendingVerificationPastryEmail } from '$lib/emails/order-pending-verification-pastry';
import { QuoteConfirmationEmail } from '$lib/emails/quote-confirmation';
import { QuotePaymentEmail } from '$lib/emails/quote-payment';
import { QuoteSentEmail } from '$lib/emails/quote-sent';
import { QuoteRejectedEmail } from '$lib/emails/quote-rejected';
import { CustomRequestConfirmationEmail } from '$lib/emails/custom-request-confirmation';
import { CustomRequestNotificationEmail } from '$lib/emails/custom-request-notification';
import { RequestRejectedEmail } from '$lib/emails/request-rejected';
import { OrderCancelledEmail } from '$lib/emails/order-cancelled';
import { ContactConfirmationEmail } from '$lib/emails/contact-confirmation';
import { ContactNotificationEmail } from '$lib/emails/contact-notification';
import { PaymentFailedNotificationEmail } from '$lib/emails/payment-failed-notification';
import { CriticalErrorNotificationEmail } from '$lib/emails/critical-error-notification';
import { MarketingCampaignEmail } from '$lib/emails/marketing-campaign';

// Initialisation de Resend
const resend = new Resend(env.RESEND_API_KEY);

export class EmailService {
    /**
     * Envoie un email de confirmation de commande au client
     */
    static async sendOrderConfirmation({
        customerEmail,
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
        shopColor,
    }: {
        customerEmail: string;
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
        shopColor?: string | null;
    }) {
        try {
            const { data, error } = await resend.emails.send({
                from: 'Pattyly <noreply@pattyly.com>',
                to: [customerEmail],
                subject: `Commande confirmée - ${productName}`,
                html: OrderConfirmationEmail({
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
                    shopColor,
                })
            });

            if (error) {
                console.error('Erreur envoi email confirmation commande:', error);
                throw error;
            }

            return { success: true, messageId: data?.id };
        } catch (error) {
            console.error('Erreur EmailService.sendOrderConfirmation:', error);
            throw error;
        }
    }

    /**
     * Envoie un email au client pour une commande en attente de vérification (PayPal.me)
     */
    static async sendOrderPendingVerificationClient({
        customerEmail,
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
        orderRef,
        date,
        shopColor,
    }: {
        customerEmail: string;
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
        orderRef: string;
        date: string;
        shopColor?: string | null;
    }) {
        try {
            const { data, error } = await resend.emails.send({
                from: 'Pattyly <noreply@pattyly.com>',
                to: [customerEmail],
                subject: `Commande enregistrée - ${productName}`,
                html: OrderPendingVerificationClientEmail({
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
                    orderRef,
                    date,
                    shopColor,
                })
            });

            if (error) {
                console.error('Erreur envoi email client pending verification:', error);
                throw error;
            }

            return { success: true, messageId: data?.id };
        } catch (error) {
            console.error('Erreur EmailService.sendOrderPendingVerificationClient:', error);
            throw error;
        }
    }

    /**
     * Envoie une notification au pâtissier pour une commande en attente de vérification (PayPal.me)
     */
    static async sendOrderPendingVerificationPastry({
        pastryEmail,
        customerName,
        customerEmail,
        customerInstagram,
        productName,
        pickupDate,
        pickupTime,
        totalAmount,
        paidAmount,
        remainingAmount,
        orderId,
        orderRef,
        dashboardUrl,
        date,
    }: {
        pastryEmail: string;
        customerName: string;
        customerEmail: string;
        customerInstagram?: string;
        productName: string;
        pickupDate: string;
        pickupTime?: string | null;
        totalAmount: number;
        paidAmount: number;
        remainingAmount: number;
        orderId: string;
        orderRef: string;
        dashboardUrl: string;
        date: string;
    }) {
        try {
            const { data, error } = await resend.emails.send({
                from: 'Pattyly <noreply@pattyly.com>',
                to: [pastryEmail],
                subject: `Nouvelle commande - Vérification requise`,
                html: OrderPendingVerificationPastryEmail({
                    customerName,
                    customerEmail,
                    customerInstagram,
                    productName,
                    pickupDate,
                    pickupTime,
                    totalAmount,
                    paidAmount,
                    remainingAmount,
                    orderId,
                    orderRef,
                    dashboardUrl,
                    date,
                })
            });

            if (error) {
                console.error('Erreur envoi notification pâtissier pending verification:', error);
                throw error;
            }

            return { success: true, messageId: data?.id };
        } catch (error) {
            console.error('Erreur EmailService.sendOrderPendingVerificationPastry:', error);
            throw error;
        }
    }

    /**
     * Envoie une notification de nouvelle commande au pâtissier
     */
    static async sendOrderNotification({
        pastryEmail,
        customerName,
        customerEmail,
        customerInstagram,
        productName,
        pickupDate,
        pickupTime,
        totalAmount,
        paidAmount,
        remainingAmount,
        orderId,
        dashboardUrl,
        date,
    }: {
        pastryEmail: string;
        customerName: string;
        customerEmail: string;
        customerInstagram?: string;
        productName: string;
        pickupDate: string;
        pickupTime?: string | null;
        totalAmount: number;
        paidAmount: number;
        remainingAmount: number;
        orderId: string;
        dashboardUrl: string;
        date: string;
    }) {
        try {
            const { data, error } = await resend.emails.send({
                from: 'Pattyly <noreply@pattyly.com>',
                to: [pastryEmail],
                subject: `Nouvelle commande - ${productName}`,
                html: OrderNotificationEmail({
                    customerName,
                    customerEmail,
                    customerInstagram,
                    productName,
                    pickupDate,
                    pickupTime,
                    totalAmount,
                    paidAmount,
                    remainingAmount,
                    orderId,
                    dashboardUrl,
                    date,
                })
            });

            if (error) {
                console.error('Erreur envoi notification commande:', error);
                throw error;
            }

            return { success: true, messageId: data?.id };
        } catch (error) {
            console.error('Erreur EmailService.sendOrderNotification:', error);
            throw error;
        }
    }

    /**
     * Envoie un email de confirmation de devis au client
     */
    static async sendQuoteConfirmation({
        customerEmail,
        customerName,
        shopName,
        shopLogo,
        pickupDate,
        pickupTime,
        totalPrice,
        depositAmount,
        remainingAmount,
        orderId,
        orderUrl,
        date,
        shopColor,
    }: {
        customerEmail: string;
        customerName: string;
        shopName: string;
        shopLogo?: string;
        pickupDate: string;
        pickupTime?: string | null;
        totalPrice: number;
        depositAmount: number;
        remainingAmount: number;
        orderId: string;
        orderUrl: string;
        date: string;
        shopColor?: string | null;
    }) {
        try {
            const { data, error } = await resend.emails.send({
                from: 'Pattyly <noreply@pattyly.com>',
                to: customerEmail,
                subject: `Commande personnalisée confirmée`,
                html: QuoteConfirmationEmail({
                    customerName,
                    shopName,
                    shopLogo,
                    pickupDate,
                    pickupTime,
                    totalPrice,
                    depositAmount,
                    remainingAmount,
                    orderId,
                    orderUrl,
                    date,
                    shopColor,
                })
            });

            if (error) {
                console.error('Erreur envoi confirmation devis:', error);
                throw error;
            }

            return { success: true, messageId: data?.id };
        } catch (error) {
            console.error('Erreur EmailService.sendQuoteConfirmation:', error);
            throw error;
        }
    }

    /**
     * Envoie une notification de paiement de devis au pâtissier
     */
    static async sendQuotePayment({
        pastryEmail,
        customerName,
        customerEmail,
        pickupDate,
        pickupTime,
        totalPrice,
        depositAmount,
        remainingAmount,
        orderId,
        dashboardUrl,
        date,
    }: {
        pastryEmail: string;
        customerName: string;
        customerEmail: string;
        pickupDate: string;
        pickupTime?: string | null;
        totalPrice: number;
        depositAmount: number;
        remainingAmount: number;
        orderId: string;
        dashboardUrl: string;
        date: string;
    }) {
        try {
            const { data, error } = await resend.emails.send({
                from: 'Pattyly <noreply@pattyly.com>',
                to: [pastryEmail],
                subject: `Paiement reçu - Commande personnalisée`,
                html: QuotePaymentEmail({
                    customerName,
                    customerEmail,
                    pickupDate,
                    pickupTime,
                    totalPrice,
                    depositAmount,
                    remainingAmount,
                    orderId,
                    dashboardUrl,
                    date,
                })
            });

            if (error) {
                console.error('Erreur envoi notification paiement devis:', error);
                throw error;
            }

            return { success: true, messageId: data?.id };
        } catch (error) {
            console.error('Erreur EmailService.sendQuotePayment:', error);
            throw error;
        }
    }

    /**
     * Envoie un devis au client
     */
    static async sendQuote({
        customerEmail,
        customerName,
        shopName,
        shopLogo,
        quoteId,
        orderUrl,
        date,
        shopColor,
    }: {
        customerEmail: string;
        customerName: string;
        shopName: string;
        shopLogo?: string;
        quoteId: string;
        orderUrl: string;
        date: string;
        shopColor?: string | null;
    }) {
        try {
            const { data, error } = await resend.emails.send({
                from: 'Pattyly <noreply@pattyly.com>',
                to: customerEmail,
                subject: `Votre devis est prêt !`,
                html: QuoteSentEmail({
                    customerName,
                    shopName,
                    shopLogo,
                    quoteId,
                    orderUrl,
                    date,
                    shopColor,
                })
            });

            if (error) {
                console.error('Erreur envoi devis:', error);
                throw error;
            }

            return { success: true, messageId: data?.id };
        } catch (error) {
            console.error('Erreur EmailService.sendQuote:', error);
            throw error;
        }
    }

    /**
     * Envoie une notification de devis refusé au client
     */
    static async sendQuoteRejected({
        pastryEmail,
        customerEmail,
        customerName,
        quoteId,
        orderUrl,
        date,
    }: {
        pastryEmail: string;
        customerEmail: string;
        customerName: string;
        quoteId: string;
        orderUrl: string;
        date: string;
    }) {
        try {
            const { data, error } = await resend.emails.send({
                from: 'Pattyly <noreply@pattyly.com>',
                to: pastryEmail,
                subject: `Devis refusé`,
                html: QuoteRejectedEmail({
                    customerName,
                    customerEmail,
                    quoteId,
                    orderUrl,
                    date,
                })
            });

            if (error) {
                console.error('Erreur envoi devis refusé:', error);
                throw error;
            }

            return { success: true, messageId: data?.id };
        } catch (error) {
            console.error('Erreur EmailService.sendQuoteRejected:', error);
            throw error;
        }
    }

    /**
     * Envoie une confirmation de demande personnalisée au client
     */
    static async sendCustomRequestConfirmation({
        customerEmail,
        customerName,
        shopName,
        shopLogo,
        requestId,
        orderUrl,
        date,
        shopColor,
    }: {
        customerEmail: string;
        customerName: string;
        shopName: string;
        shopLogo?: string;
        requestId: string;
        orderUrl: string;
        date: string;
        shopColor?: string | null;
    }) {
        try {
            const { data, error } = await resend.emails.send({
                from: 'Pattyly <noreply@pattyly.com>',
                to: customerEmail,
                subject: `Demande personnalisée envoyée`,
                html: CustomRequestConfirmationEmail({
                    customerName,
                    shopName,
                    shopLogo,
                    requestId,
                    orderUrl,
                    date,
                    shopColor,
                })
            });

            if (error) {
                console.error('Erreur envoi confirmation demande personnalisée:', error);
                throw error;
            }

            return { success: true, messageId: data?.id };
        } catch (error) {
            console.error('Erreur EmailService.sendCustomRequestConfirmation:', error);
            throw error;
        }
    }

    /**
     * Envoie une notification de demande personnalisée au pâtissier
     */
    static async sendCustomRequestNotification({
        pastryEmail,
        customerName,
        customerEmail,
        customerInstagram,
        pickupDate,
        pickupTime,
        requestId,
        dashboardUrl,
        date,
    }: {
        pastryEmail: string;
        customerName: string;
        customerEmail: string;
        customerInstagram?: string;
        pickupDate: string;
        pickupTime?: string | null;
        requestId: string;
        dashboardUrl: string;
        date: string;
    }) {
        try {
            const { data, error } = await resend.emails.send({
                from: 'Pattyly <noreply@pattyly.com>',
                to: pastryEmail,
                subject: `Nouvelle demande personnalisée`,
                html: CustomRequestNotificationEmail({
                    customerName,
                    customerEmail,
                    customerInstagram,
                    pickupDate,
                    pickupTime,
                    requestId,
                    dashboardUrl,
                    date,
                })
            });

            if (error) {
                console.error('Erreur envoi notification demande personnalisée:', error);
                throw error;
            }

            return { success: true, messageId: data?.id };
        } catch (error) {
            console.error('Erreur EmailService.sendCustomRequestNotification:', error);
            throw error;
        }
    }

    /**
     * Envoie une notification de demande refusée au client
     */
    static async sendRequestRejected({
        customerEmail,
        customerName,
        shopName,
        shopLogo,
        reason,
        requestId,
        catalogUrl,
        date,
        shopColor,
    }: {
        customerEmail: string;
        customerName: string;
        shopName: string;
        shopLogo?: string;
        reason?: string;
        requestId: string;
        catalogUrl: string;
        date: string;
        shopColor?: string | null;
    }) {
        try {
            const { data, error } = await resend.emails.send({
                from: 'Pattyly <noreply@pattyly.com>',
                to: customerEmail,
                subject: `Demande refusée`,
                html: RequestRejectedEmail({
                    customerName,
                    shopName,
                    shopLogo,
                    reason,
                    requestId,
                    catalogUrl,
                    date,
                    shopColor,
                })
            });

            if (error) {
                console.error('Erreur envoi demande refusée:', error);
                throw error;
            }

            return { success: true, messageId: data?.id };
        } catch (error) {
            console.error('Erreur EmailService.sendRequestRejected:', error);
            throw error;
        }
    }

    /**
     * Envoie une notification de commande annulée au client
     */
    static async sendOrderCancelled({
        customerEmail,
        customerName,
        shopName,
        shopLogo,
        orderId,
        orderUrl,
        date,
        chefMessage,
        willRefund = false,
        shopColor,
    }: {
        customerEmail: string;
        customerName: string;
        shopName: string;
        shopLogo?: string;
        orderId: string;
        orderUrl: string;
        date: string;
        chefMessage?: string;
        willRefund?: boolean;
        shopColor?: string | null;
    }) {
        try {
            const { data, error } = await resend.emails.send({
                from: 'Pattyly <noreply@pattyly.com>',
                to: customerEmail,
                subject: `Commande annulée`,
                html: OrderCancelledEmail({
                    customerName,
                    shopName,
                    shopLogo,
                    orderId,
                    orderUrl,
                    date,
                    chefMessage,
                    willRefund,
                    shopColor,
                })
            });

            if (error) {
                console.error('Erreur envoi commande annulée:', error);
                throw error;
            }

            return { success: true, messageId: data?.id };
        } catch (error) {
            console.error('Erreur EmailService.sendOrderCancelled:', error);
            throw error;
        }
    }

    /**
     * Envoie une confirmation de contact au client
     */
    static async sendContactConfirmation({
        customerName,
        customerEmail,
        message,
        subject
    }: {
        customerEmail: string;
        customerName: string;
        message: string;
        subject: string;
    }) {
        try {
            const { data, error } = await resend.emails.send({
                from: 'Pattyly <noreply@pattyly.com>',
                to: customerEmail,
                subject: `Pattyly - Message reçu`,
                html: ContactConfirmationEmail({
                    name: customerName,
                    subject,
                    message,
                })
            });

            if (error) {
                console.error('Erreur envoi confirmation contact:', error);
                throw error;
            }

            return { success: true, messageId: data?.id };
        } catch (error) {
            console.error('Erreur EmailService.sendContactConfirmation:', error);
            throw error;
        }
    }

    /**
     * Envoie une notification de contact au pâtissier
     */
    static async sendContactNotification({
        customerName,
        customerEmail,
        subject,
        message,
        date,
    }: {
        customerName: string;
        customerEmail: string;
        subject: string;
        message: string;
        date: string;
    }) {
        try {
            const { data, error } = await resend.emails.send({
                from: 'Pattyly <noreply@pattyly.com>',
                to: "contact@pattyly.com",
                subject: `Nouveau message - ${customerEmail}`,
                html: ContactNotificationEmail({
                    name: customerName,
                    email: customerEmail,
                    subject,
                    message,
                    date,
                })
            });

            if (error) {
                console.error('Erreur envoi notification contact:', error);
                throw error;
            }

            return { success: true, messageId: data?.id };
        } catch (error) {
            console.error('Erreur EmailService.sendContactNotification:', error);
            throw error;
        }
    }

    /**
     * Envoie une notification de paiement échoué au pâtissier
     */
    static async sendPaymentFailedNotification({
        pastryEmail,
        shopName,
        customerPortalUrl,
        date,
    }: {
        pastryEmail: string;
        shopName: string;
        customerPortalUrl: string;
        date: string;
    }) {
        try {
            const { data, error } = await resend.emails.send({
                from: 'Pattyly <noreply@pattyly.com>',
                to: [pastryEmail],
                subject: `Paiement échoué - Action requise`,
                html: PaymentFailedNotificationEmail({
                    shopName,
                    customerPortalUrl,
                    date,
                })
            });

            if (error) {
                console.error('Erreur envoi email paiement échoué:', error);
                throw error;
            }

            return { success: true, messageId: data?.id };
        } catch (error) {
            console.error('Erreur EmailService.sendPaymentFailedNotification:', error);
            throw error;
        }
    }

    /**
     * Envoie un code OTP pour l'authentification admin
     */
    static async sendAdminOTP({
        email,
        code,
    }: {
        email: string;
        code: string;
    }) {
        try {
            const { data, error } = await resend.emails.send({
                from: 'Pattyly <noreply@pattyly.com>',
                to: [email],
                subject: 'Code de connexion admin - Pattyly',
                html: `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="utf-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    </head>
                    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <div style="background-color: #f9fafb; padding: 30px; border-radius: 8px;">
                            <h1 style="color: #1f2937; margin-top: 0;">Code de connexion admin</h1>
                            <p>Votre code de connexion pour accéder au dashboard admin est :</p>
                            <div style="background-color: #ffffff; border: 2px solid #e5e7eb; border-radius: 6px; padding: 20px; text-align: center; margin: 20px 0;">
                                <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #ff6f61;">${code}</span>
                            </div>
                            <p style="color: #6b7280; font-size: 14px;">Ce code est valide pendant 10 minutes.</p>
                            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">Si vous n'avez pas demandé ce code, ignorez cet email.</p>
                        </div>
                    </body>
                    </html>
                `
            });

            if (error) {
                console.error('Erreur envoi email OTP admin:', error);
                throw error;
            }

            return { success: true, messageId: data?.id };
        } catch (error) {
            console.error('Erreur EmailService.sendAdminOTP:', error);
            throw error;
        }
    }

    /**
     * Envoie une notification d'erreur critique à l'admin
     */
    static async sendCriticalErrorNotification({
        errorMessage,
        errorStack,
        errorName,
        severity,
        context,
        metadata,
        timestamp,
    }: {
        errorMessage: string;
        errorStack?: string;
        errorName: string;
        severity: 'critical' | 'error' | 'warning';
        context: Record<string, any>;
        metadata: Record<string, any>;
        timestamp: string;
    }) {
        try {
            const severityLabels = {
                critical: 'CRITIQUE',
                error: 'ERREUR',
                warning: 'AVERTISSEMENT'
            };

            const { data, error } = await resend.emails.send({
                from: 'Pattyly Alerts <noreply@pattyly.com>',
                to: ['pattyly.saas+error@gmail.com'],
                subject: `[${severityLabels[severity]}] ${errorName} - Pattyly`,
                html: CriticalErrorNotificationEmail({
                    errorMessage,
                    errorStack,
                    errorName,
                    severity,
                    context,
                    metadata,
                    timestamp,
                })
            });

            if (error) {
                console.error('Erreur envoi email notification erreur critique:', error);
                throw error;
            }

            return { success: true, messageId: data?.id };
        } catch (error) {
            // Ne pas logguer ici pour éviter les boucles infinies
            // Si l'envoi d'email échoue, on accepte la perte silencieuse
            throw error;
        }
    }

    /**
     * Envoie une notification de paiement d'affiliation au parrain
     */
    static async sendAffiliatePayoutNotification({
        pastryEmail,
        amount,
        commissionCount,
        periodMonth,
        periodYear,
        payoutDate,
    }: {
        pastryEmail: string;
        amount: number;
        commissionCount: number;
        periodMonth: string;
        periodYear: number;
        payoutDate: string;
    }) {
        try {
            const { PUBLIC_SITE_URL } = await import('$env/static/public');
            
            // Formater le prix
            const formatPrice = (price: number): string => {
                return new Intl.NumberFormat('fr-FR', {
                    style: 'currency',
                    currency: 'EUR',
                }).format(price);
            };

            const { data, error } = await resend.emails.send({
                from: 'Pattyly <noreply@pattyly.com>',
                to: [pastryEmail],
                subject: `Pattyly - 💰 Paiement de commissions d'affiliation - ${formatPrice(amount)}`,
                html: `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="utf-8">
                        <style>
                            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
                            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                            .header { background: #FF6F61; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
                            .amount { font-size: 32px; font-weight: bold; color: #FF6F61; text-align: center; margin: 20px 0; }
                            .info { background: white; padding: 15px; border-radius: 4px; margin: 15px 0; }
                            .info ul { margin: 10px 0; padding-left: 20px; }
                            .info li { margin: 5px 0; }
                            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
                            .button { display: inline-block; padding: 12px 24px; background: #FF6F61; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <div class="header">
                                <h1>💰 Paiement de commissions reçu</h1>
                            </div>
                            <div class="content">
                                <p>Bonjour,</p>
                                <p>Nous avons effectué le virement de tes commissions d'affiliation pour la période de <strong>${periodMonth} ${periodYear}</strong>.</p>
                                
                                <div class="amount">${formatPrice(amount)}</div>
                                
                                <div class="info">
                                    <p><strong>Détails du paiement :</strong></p>
                                    <ul>
                                        <li><strong>Montant total :</strong> ${formatPrice(amount)}</li>
                                        <li><strong>Nombre de commissions :</strong> ${commissionCount}</li>
                                        <li><strong>Période :</strong> ${periodMonth} ${periodYear}</li>
                                        <li><strong>Date de paiement :</strong> ${payoutDate}</li>
                                    </ul>
                                </div>
                                
                                <p>Le virement a été effectué sur ton compte bancaire via Stripe Connect. Il devrait arriver sous 1 à 3 jours ouvrés.</p>
                                
                                <div style="text-align: center;">
                                    <a href="${PUBLIC_SITE_URL}/dashboard/affiliation" class="button">Voir l'historique</a>
                                </div>
                                
                                <p>Merci de faire confiance à Pattyly ! 🎂</p>
                                
                                <div class="footer">
                                    <p>Pattyly - La plateforme pensée pour simplifier le quotidien des pâtissiers</p>
                                </div>
                            </div>
                        </div>
                    </body>
                    </html>
                `
            });

            if (error) {
                console.error('Erreur envoi email paiement affiliation:', error);
                throw error;
            }

            return { success: true, messageId: data?.id };
        } catch (error) {
            console.error('Erreur EmailService.sendAffiliatePayoutNotification:', error);
            throw error;
        }
    }

    /**
     * Envoie une notification quand un pâtissier active son code d'affiliation
     */
    static async sendAffiliateActivationNotification({
        shopName,
        shopSlug,
        shopInstagram,
        shopTiktok,
        shopUrl,
        affiliateCode
    }: {
        shopName: string;
        shopSlug: string;
        shopInstagram: string | null;
        shopTiktok: string | null;
        shopUrl: string;
        affiliateCode: string;
    }) {
        try {
            const { data, error } = await resend.emails.send({
                from: 'Pattyly <noreply@pattyly.com>',
                to: ['affiliations@pattyly.com'],
                subject: `Nouveau code d'affiliation activé - ${shopName}`,
                html: `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="utf-8">
                        <style>
                            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
                            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                            .header { background: #FF6F61; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
                            .info { background: white; padding: 15px; border-radius: 4px; margin: 15px 0; }
                            .info p { margin: 10px 0; }
                            .button { display: inline-block; padding: 12px 24px; background: #FF6F61; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
                            code { background: #f0f0f0; padding: 2px 6px; border-radius: 3px; font-family: monospace; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <div class="header">
                                <h1>🎉 Nouveau code d'affiliation activé</h1>
                            </div>
                            <div class="content">
                                <p>Bonjour,</p>
                                <p>Un nouveau pâtissier a activé son code d'affiliation.</p>
                                
                                <div class="info">
                                    <p><strong>Boutique :</strong> ${shopName}</p>
                                    <p><strong>Code d'affiliation :</strong> <code>${affiliateCode}</code></p>
                                    ${shopInstagram ? `<p><strong>Instagram :</strong> <a href="https://instagram.com/${shopInstagram.replace('@', '')}">@${shopInstagram.replace('@', '')}</a></p>` : ''}
                                    ${shopTiktok ? `<p><strong>TikTok :</strong> <a href="https://tiktok.com/@${shopTiktok.replace('@', '')}">@${shopTiktok.replace('@', '')}</a></p>` : ''}
                                </div>
                                
                                <div style="text-align: center;">
                                    <a href="${shopUrl}" class="button">Voir la boutique</a>
                                </div>
                            </div>
                        </div>
                    </body>
                    </html>
                `
            });

            if (error) {
                console.error('Erreur envoi email activation affiliation:', error);
                throw error;
            }

            return { success: true, messageId: data?.id };
        } catch (error) {
            console.error('Erreur EmailService.sendAffiliateActivationNotification:', error);
            throw error;
        }
    }

    /**
     * Envoie un email de campagne marketing à un destinataire
     */
    static async sendMarketingCampaign({
        recipientEmail,
        recipientName,
        subject,
        content,
        ctaText,
        ctaUrl,
    }: {
        recipientEmail: string;
        recipientName?: string;
        subject: string;
        content: string;
        ctaText?: string;
        ctaUrl?: string;
    }) {
        try {
            // Vérifier si l'utilisateur est désabonné
            try {
                const { data: contact, error: contactError } = await resend.contacts.get({ email: recipientEmail });
                
                if (!contactError && contact?.unsubscribed === true) {
                    console.log(`⏭️  ${recipientEmail} est désabonné, email non envoyé`);
                    return { success: true, skipped: true, messageId: null };
                }
            } catch (error) {
                // Si le contact n'existe pas ou erreur, on continue (première fois qu'on envoie)
                // Ne pas bloquer l'envoi en cas d'erreur de vérification
            }

            const date = new Date().toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });

            const siteUrl = env.PUBLIC_SITE_URL || 'https://pattyly.com';
            const unsubscribeUrl = `${siteUrl}/unsubscribe?email=${encodeURIComponent(recipientEmail)}`;

            const { data, error } = await resend.emails.send({
                from: 'L\'équipe Pattyly <hello@pattyly.com>',
                to: [recipientEmail],
                subject: subject,
                html: MarketingCampaignEmail({
                    recipientName,
                    subject,
                    content,
                    ctaText,
                    ctaUrl,
                    date,
                    recipientEmail,
                }),
                headers: {
                    'List-Unsubscribe': `<${unsubscribeUrl}>, <mailto:hello@pattyly.com?subject=Unsubscribe&body=Please%20unsubscribe%20${encodeURIComponent(recipientEmail)}>`,
                    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
                }
            });

            if (error) {
                console.error('Erreur envoi email campagne marketing:', error);
                throw error;
            }

            return { success: true, messageId: data?.id };
        } catch (error) {
            console.error('Erreur EmailService.sendMarketingCampaign:', error);
            throw error;
        }
    }
}