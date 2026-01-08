// handlers/payment-handlers.ts
import { error } from '@sveltejs/kit';
import Stripe from 'stripe';
import { EmailService } from '$lib/services/email-service';
import { PUBLIC_SITE_URL } from '$env/static/public';
import { PRIVATE_STRIPE_SECRET_KEY } from '$env/static/private';
import { ErrorLogger } from '$lib/services/error-logging';

export async function handlePaymentSucceeded(invoice: Stripe.Invoice, locals: any): Promise<void> {
    console.log('💰 [Payment Succeeded] Webhook reçu:', {
        invoiceId: invoice.id,
        customerId: invoice.customer,
        subscriptionId: invoice.subscription,
        amountPaid: invoice.amount_paid,
        amountDue: invoice.amount_due,
        subtotal: invoice.subtotal,
        status: invoice.status
    });

    try {
        // ✅ Récupérer l'invoice complète depuis Stripe pour avoir tous les champs (notamment subscription)
        const stripe = new Stripe(PRIVATE_STRIPE_SECRET_KEY, {
            apiVersion: '2024-04-10'
        });

        const fullInvoice = await stripe.invoices.retrieve(invoice.id, {
            expand: ['subscription']
        });

        console.log('📄 [Payment Succeeded] Invoice complète récupérée:', {
            invoiceId: fullInvoice.id,
            subscriptionId: fullInvoice.subscription,
            hasSubscription: !!fullInvoice.subscription
        });

        // Récupérer le customer_id depuis l'invoice
        const customerId = fullInvoice.customer as string;

        // Récupérer le profile_id depuis stripe_customers
        const { data: customerData } = await locals.supabaseServiceRole
            .from('stripe_customers')
            .select('profile_id')
            .eq('stripe_customer_id', customerId)
            .single();

        if (!customerData) {
            console.log('⚠️ [Payment Succeeded] Customer non trouvé:', customerId);
            return;
        }

        const profileId = customerData.profile_id;
        console.log('✅ [Payment Succeeded] Profile trouvé:', profileId);

        // Réactiver l'abonnement après un paiement réussi
        const { error: updateError } = await locals.supabaseServiceRole
            .from('user_products')
            .update({
                subscription_status: 'active'
            })
            .eq('profile_id', profileId);

        if (updateError) {
            await ErrorLogger.logCritical(updateError, {
                stripeCustomerId: customerId,
                profileId: profileId,
            }, {
                handler: 'handlePaymentSucceeded',
                step: 'reactivate_subscription',
            });
            throw error(500, 'Failed to reactivate subscription after payment success');
        }

        // ✅ NOUVEAU : Gérer la commission d'affiliation avec l'invoice complète
        await processAffiliateCommission(fullInvoice, profileId, locals);

    } catch (err) {
        await ErrorLogger.logCritical(err, {
            stripeInvoiceId: invoice.id,
            stripeCustomerId: invoice.customer as string,
        }, {
            handler: 'handlePaymentSucceeded',
            step: 'general_error',
        });
        throw error(500, 'handlePaymentSucceeded failed: ' + err);
    }
}

export async function handlePaymentFailed(invoice: Stripe.Invoice, locals: any): Promise<void> {
    try {
        // Récupérer le customer_id depuis l'invoice
        const customerId = invoice.customer as string;

        // Récupérer le profile_id depuis stripe_customers
        const { data: customerData } = await locals.supabaseServiceRole
            .from('stripe_customers')
            .select('profile_id')
            .eq('stripe_customer_id', customerId)
            .single();

        if (!customerData) {
            console.log('Customer not found for payment failed notification');
            return;
        }

        const profileId = customerData.profile_id;

        // Récupérer email du pâtissier + slug + name de la boutique en une seule requête
        const { data: userShopData, error: userShopError } = await locals.supabaseServiceRole
            .from('profiles')
            .select('email, shops(name, slug)')
            .eq('id', profileId)
            .single();

        if (userShopError || !userShopData) {
            await ErrorLogger.logCritical(
                userShopError || new Error('Failed to get user/shop data'),
                {
                    stripeCustomerId: customerId,
                    profileId: profileId,
                },
                {
                    handler: 'handlePaymentFailed',
                    step: 'fetch_user_shop_data',
                }
            );
            return;
        }

        // Envoyer l'email de notification de paiement échoué
        if (userShopData.email) {
            try {
                // Créer une session de portail de facturation Stripe
                const stripe = new Stripe(PRIVATE_STRIPE_SECRET_KEY, {
                    apiVersion: '2024-04-10'
                });

                const portalSession = await stripe.billingPortal.sessions.create({
                    customer: customerId,
                    return_url: `${PUBLIC_SITE_URL}/dashboard/settings`,
                });

                await EmailService.sendPaymentFailedNotification({
                    pastryEmail: userShopData.email,
                    shopName: userShopData.shops.name,
                    customerPortalUrl: portalSession.url,
                    date: new Date().toLocaleDateString("fr-FR"),
                });

                console.log(`Payment failed notification sent to ${userShopData.email}`);
            } catch (emailError) {
                await ErrorLogger.logCritical(emailError, {
                    stripeCustomerId: customerId,
                    profileId: profileId,
                    pastryEmail: userShopData.email,
                }, {
                    handler: 'handlePaymentFailed',
                    step: 'send_notification_email',
                });
            }
        }

    } catch (err) {
        await ErrorLogger.logCritical(err, {
            stripeInvoiceId: invoice.id,
            stripeCustomerId: invoice.customer as string,
        }, {
            handler: 'handlePaymentFailed',
            step: 'general_error',
        });
        throw error(500, 'handlePaymentFailed failed: ' + err);
    }
}

export async function processAffiliateCommission(
    invoice: Stripe.Invoice,
    referredProfileId: string,
    locals: any
): Promise<void> {
    // Le subscription peut être un ID (string) ou un objet (avec expand)
    const subscriptionId = typeof invoice.subscription === 'string'
        ? invoice.subscription
        : (invoice.subscription as any)?.id;

    console.log('💼 [Affiliation Commission] Début traitement commission:', {
        invoiceId: invoice.id,
        subscriptionId: subscriptionId,
        subscriptionType: typeof invoice.subscription,
        subscriptionValue: invoice.subscription,
        referredProfileId,
        amountPaid: invoice.amount_paid,
        amountDue: invoice.amount_due,
        subtotal: invoice.subtotal
    });

    try {
        // Vérifier si c'est un paiement d'abonnement (pas un paiement unique)
        if (!subscriptionId) {
            console.log('⚠️ [Affiliation Commission] Pas une facture d\'abonnement, ignorée:', {
                hasSubscription: !!invoice.subscription,
                subscriptionType: typeof invoice.subscription
            });
            return;
        }

        // ✅ DEBUG : Chercher TOUTES les affiliations pour ce profil
        const { data: allAffiliations, error: allAffiliationsError } = await (locals.supabaseServiceRole as any)
            .from('affiliations')
            .select('id, referred_profile_id, referrer_profile_id, status, subscription_started_at')
            .eq('referred_profile_id', referredProfileId);

        console.log('🔍 [Affiliation Commission] DEBUG - Toutes les affiliations pour ce profil:', {
            referredProfileId,
            count: allAffiliations?.length || 0,
            affiliations: allAffiliations,
            error: allAffiliationsError?.message
        });

        // Récupérer l'affiliation active
        const { data: affiliation, error: affiliationError } = await (locals.supabaseServiceRole as any)
            .from('affiliations')
            .select('*')
            .eq('referred_profile_id', referredProfileId)
            .eq('status', 'active')
            .maybeSingle();

        if (affiliationError) {
            console.error('❌ [Affiliation Commission] Erreur récupération affiliation:', {
                error: affiliationError,
                code: affiliationError.code,
                message: affiliationError.message,
                details: affiliationError.details
            });
            return;
        }

        if (!affiliation) {
            console.log('ℹ️ [Affiliation Commission] Aucune affiliation active trouvée pour ce profil:', {
                referredProfileId,
                invoiceId: invoice.id,
                subscriptionId: subscriptionId,
                allAffiliationsFound: allAffiliations?.length || 0
            });

            // ✅ DEBUG : Chercher par subscription via customer
            if (invoice.customer) {
                const customerId = typeof invoice.customer === 'string' ? invoice.customer : (invoice.customer as any).id;
                const { data: customerData } = await locals.supabaseServiceRole
                    .from('stripe_customers')
                    .select('profile_id, stripe_customer_id')
                    .eq('stripe_customer_id', customerId)
                    .maybeSingle();

                console.log('🔍 [Affiliation Commission] DEBUG - Customer data:', {
                    customerId,
                    customerData
                });

                if (customerData?.profile_id) {
                    // Chercher les affiliations pour ce profile_id aussi
                    const { data: affiliationsByProfile } = await (locals.supabaseServiceRole as any)
                        .from('affiliations')
                        .select('id, referred_profile_id, referrer_profile_id, status')
                        .eq('referred_profile_id', customerData.profile_id);

                    console.log('🔍 [Affiliation Commission] DEBUG - Affiliations pour profile_id du customer:', {
                        profileId: customerData.profile_id,
                        count: affiliationsByProfile?.length || 0,
                        affiliations: affiliationsByProfile
                    });
                }
            }

            return;
        }

        console.log('✅ [Affiliation Commission] Affiliation trouvée:', {
            affiliationId: affiliation.id,
            referrerProfileId: affiliation.referrer_profile_id,
            referredProfileId: affiliation.referred_profile_id,
            status: affiliation.status,
            subscriptionStartedAt: affiliation.subscription_started_at
        });

        // Vérifier que la période de commission n'est pas dépassée
        if (affiliation.subscription_started_at) {
            const subscriptionStart = new Date(affiliation.subscription_started_at);
            const now = new Date();
            const monthsDiff = (now.getTime() - subscriptionStart.getTime()) / (1000 * 60 * 60 * 24 * 30);

            if (monthsDiff >= affiliation.commission_duration_months) {
                // Expirer l'affiliation
                await locals.supabaseServiceRole
                    .from('affiliations')
                    .update({ status: 'expired' })
                    .eq('id', affiliation.id);
                return;
            }
        }

        // Récupérer les données Stripe Connect du referrer (requête séparée pour plus de fiabilité)
        const { data: stripeConnectData, error: stripeConnectError } = await locals.supabaseServiceRole
            .from('stripe_connect_accounts')
            .select('stripe_account_id, is_active, charges_enabled, payouts_enabled')
            .eq('profile_id', affiliation.referrer_profile_id)
            .eq('is_active', true)
            .eq('charges_enabled', true)
            .eq('payouts_enabled', true)
            .maybeSingle();

        if (stripeConnectError) {
            console.error('❌ [Affiliation] Erreur récupération Stripe Connect:', stripeConnectError);
            return;
        }

        if (!stripeConnectData) {
            console.log('⚠️ [Affiliation] Stripe Connect non configuré ou inactif pour le referrer:', affiliation.referrer_profile_id);
            return;
        }

        // Calculer la commission (30% du montant brut de l'abonnement)
        // Utiliser invoice.subtotal pour avoir le montant brut (sans taxes)
        // Sinon utiliser la somme des lignes d'abonnement
        let subscriptionAmount = 0;
        if (invoice.subtotal) {
            subscriptionAmount = invoice.subtotal / 100; // Convertir de centimes en euros
        } else if (invoice.lines?.data && invoice.lines.data.length > 0) {
            // Somme des montants des lignes d'abonnement
            subscriptionAmount = invoice.lines.data.reduce((sum, line) => {
                if (line.type === 'subscription') {
                    return sum + (line.amount || 0);
                }
                return sum;
            }, 0) / 100;
        } else {
            // Fallback sur amount_due si disponible
            subscriptionAmount = (invoice.amount_due || 0) / 100;
        }

        const commissionAmount = subscriptionAmount * (affiliation.commission_rate / 100);

        console.log('💰 [Affiliation Commission] Calcul commission:', {
            subscriptionAmount,
            commissionRate: affiliation.commission_rate,
            commissionAmount,
            invoiceId: invoice.id,
            affiliationId: affiliation.id,
            referrerProfileId: affiliation.referrer_profile_id
        });

        // Vérifier si cette période a déjà été payée
        const periodStart = new Date(invoice.period_start * 1000);
        const periodEnd = new Date(invoice.period_end * 1000);

        console.log('🔍 [Affiliation Commission] Vérification commission existante:', {
            affiliationId: affiliation.id,
            periodStart: periodStart.toISOString(),
            periodEnd: periodEnd.toISOString(),
            invoiceId: invoice.id
        });

        // ✅ AMÉLIORATION : Vérifier par stripe_invoice_id en priorité (clé unique)
        // Puis par période pour éviter les doublons même si deux webhooks arrivent en même temps
        const { data: existingCommissions, error: existingCommissionError } = await (locals.supabaseServiceRole as any)
            .from('affiliate_commissions')
            .select('id, status, stripe_invoice_id, subscription_period_start')
            .eq('affiliation_id', affiliation.id)
            .or(`stripe_invoice_id.eq.${invoice.id},subscription_period_start.eq.${periodStart.toISOString()}`);

        if (existingCommissionError) {
            console.error('❌ [Affiliation Commission] Erreur vérification commission existante:', existingCommissionError);
        }

        if (existingCommissions && existingCommissions.length > 0) {
            // Vérifier si c'est exactement la même invoice ou la même période
            const sameInvoice = existingCommissions.some((c: any) => c.stripe_invoice_id === invoice.id);
            const samePeriod = existingCommissions.some((c: any) => {
                const cPeriodStart = new Date(c.subscription_period_start);
                return cPeriodStart.getTime() === periodStart.getTime();
            });

            if (sameInvoice || samePeriod) {
                console.log('ℹ️ [Affiliation Commission] Commission déjà enregistrée:', {
                    sameInvoice,
                    samePeriod,
                    count: existingCommissions.length,
                    commissions: existingCommissions.map((c: any) => ({
                        id: c.id,
                        invoiceId: c.stripe_invoice_id,
                        periodStart: c.subscription_period_start,
                        status: c.status
                    }))
                });
                return; // Déjà payé pour cette période/invoice
            }
        }

        console.log('✅ [Affiliation Commission] Aucune commission existante, on peut créer');

        // ✅ MODIFICATION : Ne plus créer le transfert immédiatement
        // Les commissions seront regroupées et virées mensuellement via le cron job
        // Cela permet de faire un seul virement par parrain par mois au lieu de plusieurs petits virements
        console.log('💾 [Affiliation Commission] Commission enregistrée en pending, sera virée mensuellement');

        // Enregistrer la commission en pending (sera virée mensuellement)
        console.log('💾 [Affiliation Commission] Enregistrement commission en base:', {
            affiliationId: affiliation.id,
            referrerProfileId: affiliation.referrer_profile_id,
            referredProfileId: referredProfileId,
            subscriptionAmount,
            commissionAmount,
            periodStart: periodStart.toISOString(),
            periodEnd: periodEnd.toISOString(),
            invoiceId: invoice.id,
            stripeAccountId: stripeConnectData.stripe_account_id,
            status: 'pending' // Toujours pending, sera mis à paid par le cron job
        });

        const { data: insertedCommission, error: insertError } = await (locals.supabaseServiceRole as any)
            .from('affiliate_commissions')
            .insert({
                affiliation_id: affiliation.id,
                referrer_profile_id: affiliation.referrer_profile_id,
                referred_profile_id: referredProfileId,
                subscription_period_start: periodStart.toISOString(),
                subscription_period_end: periodEnd.toISOString(),
                subscription_amount: subscriptionAmount,
                commission_amount: commissionAmount,
                stripe_invoice_id: invoice.id,
                stripe_transfer_id: null, // Sera rempli par le cron job lors du virement groupé
                stripe_connect_account_id: stripeConnectData.stripe_account_id,
                status: 'pending', // Toujours pending, sera mis à paid par le cron job
                paid_at: null // Sera rempli par le cron job
            })
            .select()
            .single();

        if (insertError) {
            console.error('❌ [Affiliation Commission] Erreur enregistrement commission:', insertError);
            await ErrorLogger.logCritical(insertError as Error, {
                affiliationId: affiliation.id,
                invoiceId: invoice.id,
                commissionAmount,
                subscriptionAmount
            }, {
                handler: 'processAffiliateCommission',
                step: 'insert_commission',
            });
        } else {
            console.log('✅ [Affiliation Commission] Commission enregistrée avec succès:', {
                commissionId: insertedCommission?.id,
                affiliationId: affiliation.id,
                commissionAmount,
                status: 'pending',
                message: 'Commission sera virée mensuellement via le cron job'
            });
        }

    } catch (err) {
        await ErrorLogger.logCritical(err, {
            invoiceId: invoice.id,
            referredProfileId,
        }, {
            handler: 'processAffiliateCommission',
            step: 'general_error',
        });
        // Ne pas faire échouer le webhook pour une erreur de commission
        console.error('Error processing affiliate commission:', err);
    }
}