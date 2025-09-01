import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// Fonction pour extraire l'email de base (sans plus addressing)
function getBaseEmail(email: string): string {
    const [localPart, domain] = email.split('@');
    const baseLocalPart = localPart.split('+')[0];
    return `${baseLocalPart}@${domain}`;
}

export const load: PageServerLoad = async ({ locals, request, setHeaders }) => {
    const { session } = await locals.safeGetSession();

    // Rediriger vers login si pas connecté
    if (!session) {
        throw redirect(303, '/login');
    }

    const userId = session.user.id;
    const userEmail = session.user.email;

    // Récupérer TOUS les abonnements (actifs, inactifs, en essai)
    const { data: allSubscriptions } = await (locals.supabase as any)
        .from('user_products')
        .select('stripe_product_id, subscription_status')
        .eq('profile_id', userId);

    // Vérifier l'anti-fraude : récupérer l'IP et vérifier dans la table anti_fraud
    let isInAntiFraud = false;
    let cookieFingerprint = null;
    try {
        // Récupérer l'IP de l'utilisateur
        const forwardedFor = request.headers.get('x-forwarded-for');
        const realIp = request.headers.get('x-real-ip');
        const userIp = forwardedFor?.split(',')[0] || realIp || request.headers.get('cf-connecting-ip') || '127.0.0.1';

        // Extraire l'email de base pour éviter le contournement par plus addressing
        const baseEmail = userEmail ? getBaseEmail(userEmail) : '';

        // Récupérer le fingerprint depuis les cookies (protection immédiate)
        const cookieHeader = request.headers.get('cookie') || '';
        const fingerprintMatch = cookieHeader.match(/deviceFingerprint=([^;]+)/);
        cookieFingerprint = fingerprintMatch ? fingerprintMatch[1] : null;

        console.log('🔍 Anti-fraude: Vérification pour:', {
            userId,
            userEmail,
            baseEmail, // ✅ Email de base pour la vérification
            userIp,
            cookieFingerprint: cookieFingerprint ? cookieFingerprint.substring(0, 8) + '...' : 'non trouvé'
        });

        // Vérifier si l'utilisateur est dans la table anti_fraud
        // On vérifie l'email exact, l'email de base, l'IP ET le fingerprint pour éviter le contournement
        let conditions = [`email.eq.${userEmail}`, `email.eq.${baseEmail}`, `ip_address.eq.${userIp}`];
        if (cookieFingerprint) {
            conditions.push(`fingerprint.eq.${cookieFingerprint}`);
        }

        const { data: antiFraudRecord } = await (locals.supabase as any)
            .from('anti_fraud')
            .select('id')
            .or(conditions.join(','))
            .maybeSingle();

        isInAntiFraud = !!antiFraudRecord;

        if (isInAntiFraud) {
            console.log(`🔍 Anti-fraude: Utilisateur bloqué (email: ${userEmail}, base: ${baseEmail}, IP: ${userIp}, fingerprint: ${cookieFingerprint ? cookieFingerprint.substring(0, 8) + '...' : 'non trouvé'})`);
        } else {
            console.log(`🔍 Anti-fraude: Utilisateur autorisé (email: ${userEmail}, base: ${baseEmail}, IP: ${userIp}, fingerprint: ${cookieFingerprint ? cookieFingerprint.substring(0, 8) + '...' : 'non trouvé'})`);
        }

        // ✅ SUPPRIMER LE COOKIE APRÈS VÉRIFICATION
        if (cookieFingerprint) {
            setHeaders({
                'Set-Cookie': 'deviceFingerprint=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict'
            });
            console.log('🗑️ Cookie deviceFingerprint supprimé après vérification');
        }

    } catch (error) {
        console.error('⚠️ Erreur lors de la vérification anti-fraude:', error);
        // En cas d'erreur, on considère que l'utilisateur n'est pas bloqué
        isInAntiFraud = false;
    }

    // Déterminer le plan actuel ET l'historique
    let currentPlan = null;
    let hasHadSubscription = false;

    if (allSubscriptions && allSubscriptions.length > 0) {
        hasHadSubscription = true;

        // Chercher un abonnement actif ou en essai
        const activeSubscription = allSubscriptions.find((sub: any) =>
            sub.subscription_status === 'active' || sub.subscription_status === 'trialing'
        );

        if (activeSubscription) {
            if (activeSubscription.stripe_product_id === 'prod_Selbd3Ne2plHqG') {
                currentPlan = 'basic';
            } else if (activeSubscription.stripe_product_id === 'prod_Selcz36pAfV3vV') {
                currentPlan = 'premium';
            }
        }
    }

    // Vérifier si l'utilisateur est exempté
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (locals.supabase as any)
        .from('profiles')
        .select('is_stripe_free, role')
        .eq('id', userId)
        .single();

    // Si exempté, rediriger vers le dashboard
    if (profile?.is_stripe_free || profile?.role === 'admin') {
        throw redirect(303, '/dashboard');
    }

    // Déterminer le type de boutons à afficher
    let buttonType: 'current' | 'choose' | 'trial' = 'trial';

    if (currentPlan) {
        // Utilisateur a un plan actif
        buttonType = 'current';
    } else if (hasHadSubscription || isInAntiFraud) {
        // Utilisateur a déjà eu un abonnement OU est dans anti_fraud
        buttonType = 'choose';
    } else {
        // Utilisateur peut essayer gratuitement
        buttonType = 'trial';
    }

    console.log('🎯 Type de boutons déterminé:', {
        currentPlan,
        hasHadSubscription,
        isInAntiFraud,
        buttonType
    });

    // Données des plans (en production, récupérer depuis Stripe)
    const plans = [
        {
            id: 'basic',
            name: 'Basic',
            price: 14.99,
            currency: 'EUR',
            stripePriceId: 'price_1Rre1ZPNddYt1P7Lea1N7Cbq',
            features: [
                'Jusqu\'à 10 produits',
                'Boutique en ligne personnalisée',
                'Gestion des commandes',
                'Calendrier de disponibilités',
                'Paiements sécurisés',
                'Support email'
            ],
            limitations: [],
            popular: false
        },
        {
            id: 'premium',
            name: 'Premium',
            price: 19.99,
            currency: 'EUR',
            stripePriceId: 'price_1RrdwvPNddYt1P7LGICY3by5',
            features: [
                'Produits illimités',
                'Boutique en ligne personnalisée',
                'Gestion des commandes',
                'Calendrier de disponibilités',
                'Paiements sécurisés',
                'Demandes personnalisées',
                'Support email'
            ],
            limitations: [],
            popular: true
        }
    ];

    return {
        plans,
        currentPlan,
        hasHadSubscription,
        isInAntiFraud,
        buttonType, // ✅ Nouveau champ pour déterminer le type de boutons
        user: {
            id: userId,
            email: userEmail
        }
    };
}; 