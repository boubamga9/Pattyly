import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Stripe from 'stripe';
import { PRIVATE_STRIPE_SECRET_KEY } from '$env/static/private';
import { ErrorLogger } from '$lib/services/error-logging';
import { EmailService } from '$lib/services/email-service';

const stripe = new Stripe(PRIVATE_STRIPE_SECRET_KEY, {
    apiVersion: '2024-04-10'
});

export const GET: RequestHandler = async ({ locals, url, request }) => {
    try {
        // Sécurité : vérifier que la requête vient d'un service de cron autorisé
        const cronSecret = process.env.CRON_SECRET;
        const providedSecret = url.searchParams.get('secret') ||
            url.searchParams.get('key') ||
            request.headers.get('x-cron-secret');

        // Si un secret est configuré, vérifier l'authentification
        if (cronSecret && providedSecret !== cronSecret) {
            return json({
                error: 'Unauthorized',
                message: 'Invalid or missing cron secret'
            }, { status: 401 });
        }

        // ✅ TIMEZONE : Utiliser Europe/Paris pour déterminer le jour du mois
        // Cela garantit que le cron s'exécute le bon jour selon l'heure locale
        const nowInParis = new Date(
            new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris' })
        );
        const dayOfMonth = nowInParis.getDate();
        const payoutDay = 5; // Le 5 de chaque mois

        // Ne s'exécuter que le X du mois (selon l'heure de Paris)
        if (dayOfMonth !== payoutDay) {
            return json({
                message: 'Not payout day',
                day: dayOfMonth,
                expectedDay: payoutDay,
                timezone: 'Europe/Paris'
            });
        }

        // Calculer la période du mois précédent (en UTC pour la base de données)
        const today = new Date();
        const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59);

        console.log('💰 [Cron Payout] Début traitement virements groupés:', {
            period: {
                start: lastMonthStart.toISOString(),
                end: lastMonthEnd.toISOString()
            },
            date: today.toISOString()
        });/

        // ✅ PROTECTION DOUBLONS : Récupérer uniquement les commissions pending SANS transfer_id
        // Cela garantit qu'on ne traite pas des commissions déjà payées
        const { data: pendingCommissions, error: fetchError } = await (locals.supabaseServiceRole as any)
            .from('affiliate_commissions')
            .select('*')
            .eq('status', 'pending')
            .is('stripe_transfer_id', null) // ✅ Protection : seulement celles sans transfer_id
            .gte('created_at', lastMonthStart.toISOString())
            .lte('created_at', lastMonthEnd.toISOString());

        if (fetchError) {
            console.error('❌ [Cron Payout] Erreur récupération commissions:', fetchError);
            await ErrorLogger.logCritical(fetchError, {
                periodStart: lastMonthStart.toISOString(),
                periodEnd: lastMonthEnd.toISOString()
            }, {
                handler: 'payout-affiliate-commissions',
                step: 'fetch_pending_commissions'
            });
            return json({ error: fetchError }, { status: 500 });
        }

        if (!pendingCommissions || pendingCommissions.length === 0) {
            console.log('ℹ️ [Cron Payout] Aucune commission pending à traiter');
            return json({
                message: 'No pending commissions',
                count: 0,
                period: {
                    start: lastMonthStart.toISOString(),
                    end: lastMonthEnd.toISOString()
                }
            });
        }

        console.log(`📊 [Cron Payout] ${pendingCommissions.length} commissions à traiter`);

        // Grouper par referrer_profile_id
        const commissionsByReferrer = new Map<string, any[]>();

        for (const commission of pendingCommissions) {
            const referrerId = commission.referrer_profile_id;
            if (!commissionsByReferrer.has(referrerId)) {
                commissionsByReferrer.set(referrerId, []);
            }
            commissionsByReferrer.get(referrerId)!.push(commission);
        }

        console.log(`👥 [Cron Payout] ${commissionsByReferrer.size} parrains à payer`);

        const results = [];
        let totalTransferred = 0;
        let totalCommissionsProcessed = 0;

        // Pour chaque parrain, créer UN transfert groupé
        for (const [referrerId, commissions] of commissionsByReferrer.entries()) {
            try {
                // Récupérer le compte Stripe Connect
                const firstCommission = commissions[0];
                const stripeAccountId = firstCommission.stripe_connect_account_id;

                if (!stripeAccountId) {
                    console.log(`⚠️ [Cron Payout] Pas de Stripe Connect account pour referrer ${referrerId}, skip`);
                    continue;
                }

                // ✅ PROTECTION DOUBLONS : Récupérer d'abord les commissions qui seront vraiment mises à jour
                // Cela permet de calculer le montant réel avant de créer le transfert
                const commissionIds = commissions.map((c: any) => c.id);

                // Vérifier quelles commissions peuvent encore être mises à jour (double check)
                const { data: eligibleCommissions, error: checkError } = await (locals.supabaseServiceRole as any)
                    .from('affiliate_commissions')
                    .select('id, commission_amount')
                    .in('id', commissionIds)
                    .eq('status', 'pending') // ✅ Protection : seulement celles encore pending
                    .is('stripe_transfer_id', null); // ✅ Protection : seulement celles sans transfer_id

                if (checkError) {
                    console.error(`❌ [Cron Payout] Erreur vérification commissions pour ${referrerId}:`, checkError);
                    await ErrorLogger.logCritical(checkError, {
                        referrerId,
                        commissionIds
                    }, {
                        handler: 'payout-affiliate-commissions',
                        step: 'check_eligible_commissions'
                    });
                    continue;
                }

                const eligibleCount = eligibleCommissions?.length || 0;

                // ✅ Vérifier qu'il y a des commissions éligibles
                if (eligibleCount === 0) {
                    console.warn(`⚠️ [Cron Payout] Aucune commission éligible pour ${referrerId} (toutes étaient déjà payées ?)`);
                    continue; // Passer au parrain suivant
                }

                // ✅ CORRECTION BUG : Calculer le montant RÉEL basé sur les commissions éligibles
                // Cela garantit qu'on ne transfère que ce qui peut être réellement payé
                const actualTotalAmount = eligibleCommissions.reduce((sum: number, c: any) => {
                    return sum + Math.round(parseFloat(c.commission_amount.toString()) * 100);
                }, 0);

                if (actualTotalAmount === 0) {
                    console.warn(`⚠️ [Cron Payout] Montant total 0 pour referrer ${referrerId}, skip`);
                    continue;
                }

                // Vérifier s'il y a un écart entre les commissions chargées et éligibles
                if (eligibleCount < commissions.length) {
                    const expectedAmount = commissions.reduce((sum: number, c: any) => {
                        return sum + Math.round(parseFloat(c.commission_amount.toString()) * 100);
                    }, 0);
                    console.warn(`⚠️ [Cron Payout] Écart détecté pour ${referrerId}:`, {
                        commissionsChargées: commissions.length,
                        commissionsÉligibles: eligibleCount,
                        montantAttendu: expectedAmount / 100,
                        montantRéel: actualTotalAmount / 100
                    });
                }

                // Générer une clé d'idempotence unique pour ce parrain et ce mois
                const idempotencyKey = `affiliate_payout_${referrerId}_${lastMonthStart.toISOString().slice(0, 7)}`;

                console.log(`💸 [Cron Payout] Création transfert groupé pour referrer ${referrerId}:`, {
                    amount: actualTotalAmount / 100,
                    commissionCount: eligibleCount,
                    stripeAccountId,
                    idempotencyKey
                });

                // Créer UN transfert groupé
                // ⚠️ IMPORTANT : Sans source_transaction car on regroupe plusieurs paiements
                // Le transfert sera fait depuis le balance de la plateforme
                // ✅ IDEMPOTENCY STRIPE : Utiliser une clé unique pour éviter les doublons côté Stripe
                let transfer;
                try {
                    transfer = await stripe.transfers.create({
                        amount: actualTotalAmount,
                        currency: 'eur',
                        destination: stripeAccountId,
                        description: `Commissions affiliation ${lastMonthStart.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })} (${eligibleCount} commission${eligibleCount > 1 ? 's' : ''})`,
                        metadata: {
                            referrer_profile_id: referrerId,
                            commission_count: eligibleCount.toString(),
                            period_start: lastMonthStart.toISOString(),
                            period_end: lastMonthEnd.toISOString(),
                            type: 'affiliate_commissions_monthly_payout'
                        }
                    }, {
                        idempotencyKey: idempotencyKey // ✅ Protection Stripe : si même clé → même transfert
                    });

                    console.log(`✅ [Cron Payout] Transfert créé: ${transfer.id} pour ${actualTotalAmount / 100}€`);
                } catch (transferError: any) {
                    console.error(`❌ [Cron Payout] Erreur création transfert pour ${referrerId}:`, transferError);
                    await ErrorLogger.logCritical(transferError as Error, {
                        referrerId,
                        actualTotalAmount,
                        eligibleCount,
                        commissionIds: eligibleCommissions.map((c: any) => c.id)
                    }, {
                        handler: 'payout-affiliate-commissions',
                        step: 'create_transfer'
                    });
                    throw transferError; // Re-throw pour être catché par le try/catch externe
                }

                // ✅ PROTECTION DOUBLONS : Mettre à jour UNIQUEMENT les commissions qui sont encore pending
                // Utiliser une condition WHERE pour éviter de mettre à jour des commissions déjà payées
                // (au cas où le cron serait appelé plusieurs fois le même jour)
                const eligibleCommissionIds = eligibleCommissions.map((c: any) => c.id);
                const { data: updatedCommissions, error: updateError } = await (locals.supabaseServiceRole as any)
                    .from('affiliate_commissions')
                    .update({
                        stripe_transfer_id: transfer.id,
                        status: 'paid',
                        paid_at: new Date().toISOString()
                    })
                    .in('id', eligibleCommissionIds)
                    .eq('status', 'pending') // ✅ Protection : seulement celles encore pending
                    .is('stripe_transfer_id', null) // ✅ Protection : seulement celles sans transfer_id
                    .select('id'); // Retourner les IDs mis à jour

                if (updateError) {
                    console.error(`❌ [Cron Payout] Erreur mise à jour commissions pour ${referrerId}:`, updateError);
                    await ErrorLogger.logCritical(updateError, {
                        referrerId,
                        transferId: transfer.id,
                        commissionIds: eligibleCommissionIds
                    }, {
                        handler: 'payout-affiliate-commissions',
                        step: 'update_commissions_status'
                    });
                    // Le transfert a déjà été créé, mais les commissions ne sont pas marquées comme payées
                    // C'est un état incohérent mais pas critique - on peut les corriger manuellement
                } else {
                    const finalUpdatedCount = updatedCommissions?.length || 0;
                    console.log(`✅ [Cron Payout] ${finalUpdatedCount} commissions mises à jour pour ${referrerId}`);
                    totalCommissionsProcessed += finalUpdatedCount;
                    totalTransferred += actualTotalAmount / 100; // ✅ Utiliser le montant réel basé sur les commissions éligibles
                }

                // ✅ Enregistrer le paiement dans la table affiliate_payouts
                const payoutAmount = actualTotalAmount / 100; // Convertir de centimes à euros
                const { data: payoutRecord, error: payoutInsertError } = await (locals.supabaseServiceRole as any)
                    .from('affiliate_payouts')
                    .insert({
                        referrer_profile_id: referrerId,
                        stripe_transfer_id: transfer.id,
                        amount: payoutAmount,
                        currency: 'eur',
                        commission_count: eligibleCount,
                        period_start: lastMonthStart.toISOString(),
                        period_end: lastMonthEnd.toISOString(),
                        paid_at: new Date().toISOString(),
                        email_sent: false
                    })
                    .select()
                    .single();

                if (payoutInsertError) {
                    console.error(`❌ [Cron Payout] Erreur enregistrement payout pour ${referrerId}:`, payoutInsertError);
                    await ErrorLogger.logCritical(payoutInsertError, {
                        referrerId,
                        transferId: transfer.id,
                        amount: payoutAmount
                    }, {
                        handler: 'payout-affiliate-commissions',
                        step: 'insert_payout'
                    });
                } else {
                    console.log(`✅ [Cron Payout] Payout enregistré: ${payoutRecord.id}`);

                    // ✅ Envoyer l'email au parrain (fire-and-forget pour ne pas bloquer)
                    try {
                        // Récupérer l'email du parrain
                        const { data: referrerProfile } = await locals.supabaseServiceRole.auth.admin.getUserById(referrerId);
                        const referrerEmail = referrerProfile?.user?.email;

                        if (referrerEmail) {
                            const periodMonth = lastMonthStart.toLocaleDateString('fr-FR', { month: 'long' });
                            const periodYear = lastMonthStart.getFullYear();
                            const payoutDate = new Date().toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric'
                            });

                            await EmailService.sendAffiliatePayoutNotification({
                                pastryEmail: referrerEmail,
                                amount: payoutAmount,
                                commissionCount: eligibleCount,
                                periodMonth,
                                periodYear,
                                payoutDate
                            });

                            // Mettre à jour le statut email_sent
                            await (locals.supabaseServiceRole as any)
                                .from('affiliate_payouts')
                                .update({
                                    email_sent: true,
                                    email_sent_at: new Date().toISOString()
                                })
                                .eq('id', payoutRecord.id);

                            console.log(`✅ [Cron Payout] Email envoyé à ${referrerEmail}`);
                        }
                    } catch (emailError) {
                        console.error(`❌ [Cron Payout] Erreur envoi email pour ${referrerId}:`, emailError);
                        // Ne pas bloquer le processus si l'email échoue
                        await ErrorLogger.logCritical(emailError as Error, {
                            referrerId,
                            payoutId: payoutRecord.id
                        }, {
                            handler: 'payout-affiliate-commissions',
                            step: 'send_email'
                        });
                    }
                }

                results.push({
                    referrerId,
                    transferId: transfer.id,
                    amount: actualTotalAmount / 100, // ✅ Montant réel basé sur commissions éligibles
                    commissionCount: eligibleCount, // ✅ Nombre réel de commissions payées
                    expectedCommissionCount: commissions.length, // Pour debug
                    success: true
                });

            } catch (error: any) {
                console.error(`❌ [Cron Payout] Erreur pour referrer ${referrerId}:`, error);
                await ErrorLogger.logCritical(error, {
                    referrerId,
                    commissionCount: commissions.length
                }, {
                    handler: 'payout-affiliate-commissions',
                    step: 'create_transfer'
                });
                results.push({
                    referrerId,
                    error: error.message,
                    success: false
                });
            }
        }

        console.log(`✅ [Cron Payout] Traitement terminé:`, {
            totalCommissions: pendingCommissions.length,
            totalReferrers: commissionsByReferrer.size,
            totalCommissionsProcessed,
            totalTransferred,
            resultsCount: results.length
        });

        return json({
            success: true,
            message: 'Payout completed',
            period: {
                start: lastMonthStart.toISOString(),
                end: lastMonthEnd.toISOString()
            },
            stats: {
                totalCommissions: pendingCommissions.length,
                totalReferrers: commissionsByReferrer.size,
                totalCommissionsProcessed,
                totalTransferred: Math.round(totalTransferred * 100) / 100
            },
            results
        });

    } catch (err) {
        console.error('❌ [Cron Payout] Erreur inattendue:', err);
        await ErrorLogger.logCritical(err as Error, {
            url: url.toString()
        }, {
            handler: 'payout-affiliate-commissions',
            step: 'general_error'
        });
        return json({
            error: 'Internal server error',
            details: err instanceof Error ? err.message : 'Unknown error'
        }, { status: 500 });
    }
};

// Support POST aussi (certains services de cron utilisent POST)
export const POST: RequestHandler = GET;

