import { Resend } from 'resend';
import { env } from '$env/dynamic/private';

// Templates d'emails
import { OrderConfirmationEmail } from '$lib/emails/order-confirmation';
import { OrderNotificationEmail } from '$lib/emails/order-notification';
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
import { TrialEndingNotificationEmail } from '$lib/emails/trial-ending-notification';

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
        totalAmount,
        paidAmount,
        remainingAmount,
        orderId,
        orderUrl,
        date,
    }: {
        customerEmail: string;
        customerName: string;
        shopName: string;
        shopLogo?: string;
        productName: string;
        pickupDate: string;
        totalAmount: number;
        paidAmount: number;
        remainingAmount: number;
        orderId: string;
        orderUrl: string;
        date: string;
    }) {
        try {
            const { data, error } = await resend.emails.send({
                from: 'Pattyly <noreply@pattyly.com>',
                to: [customerEmail],
                subject: `✅ Commande confirmée - ${productName}`,
                html: OrderConfirmationEmail({
                    customerName,
                    shopName,
                    shopLogo,
                    productName,
                    pickupDate,
                    totalAmount,
                    paidAmount,
                    remainingAmount,
                    orderId,
                    orderUrl,
                    date,
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
     * Envoie une notification de nouvelle commande au pâtissier
     */
    static async sendOrderNotification({
        pastryEmail,
        customerName,
        customerEmail,
        customerInstagram,
        productName,
        pickupDate,
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
                subject: `🎂 Nouvelle commande - ${productName}`,
                html: OrderNotificationEmail({
                    customerName,
                    customerEmail,
                    customerInstagram,
                    productName,
                    pickupDate,
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
        totalPrice,
        depositAmount,
        remainingAmount,
        orderId,
        orderUrl,
        date,
    }: {
        customerEmail: string;
        customerName: string;
        shopName: string;
        shopLogo?: string;
        pickupDate: string;
        totalPrice: number;
        depositAmount: number;
        remainingAmount: number;
        orderId: string;
        orderUrl: string;
        date: string;
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
                    totalPrice,
                    depositAmount,
                    remainingAmount,
                    orderId,
                    orderUrl,
                    date,
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
                subject: `💳 Paiement reçu - Commande personnalisée`,
                html: QuotePaymentEmail({
                    customerName,
                    customerEmail,
                    pickupDate,
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
        date
    }: {
        customerEmail: string;
        customerName: string;
        shopName: string;
        shopLogo?: string;
        quoteId: string;
        orderUrl: string;
        date: string;

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
                    date
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
    }: {
        customerEmail: string;
        customerName: string;
        shopName: string;
        shopLogo?: string;
        requestId: string;
        orderUrl: string;
        date: string;
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
                    date
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
        requestId,
        dashboardUrl,
        date,
    }: {
        pastryEmail: string;
        customerName: string;
        customerEmail: string;
        customerInstagram?: string;
        pickupDate: string;
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
        date
    }: {
        customerEmail: string;
        customerName: string;
        shopName: string;
        shopLogo?: string;
        reason?: string;
        requestId: string;
        catalogUrl: string;
        date: string
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
                    date
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
    }: {
        customerEmail: string;
        customerName: string;
        shopName: string;
        shopLogo?: string;
        orderId: string;
        orderUrl: string;
        date: string;

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
                subject: `Pattyly - ✅ Message reçu`,
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
                subject: `📧 Nouveau message - ${customerEmail}`,
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
     * Envoie une notification de fin de période d'essai au pâtissier
     */
    static async sendTrialEndingNotification({
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
                subject: `⏰ Votre période d'essai se termine dans 3 jours`,
                html: TrialEndingNotificationEmail({
                    shopName,
                    customerPortalUrl,
                    date,
                })
            });

            if (error) {
                console.error('Erreur envoi email fin période d\'essai:', error);
                throw error;
            }

            return { success: true, messageId: data?.id };
        } catch (error) {
            console.error('Erreur EmailService.sendTrialEndingNotification:', error);
            throw error;
        }
    }
}
