import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
    try {
        const { session } = await locals.safeGetSession();

        if (!session) {
            return json({ error: 'Non autorisé' }, { status: 401 });
        }

        if (!session.user.email) {
            return json({ error: 'Email non trouvé' }, { status: 400 });
        }

        // Vérifier si l'email est déjà confirmé
        if (session.user.email_confirmed_at) {
            return json({ error: 'Email déjà vérifié' }, { status: 400 });
        }

        // Envoyer un nouvel OTP via Supabase
        const { data, error } = await locals.supabase.auth.resend({
            type: 'signup',
            email: session.user.email
        });

        if (error) {
            console.error('🚨 Erreur lors du renvoi OTP:', error);

            if (error.message.includes('Too many requests')) {
                return json({
                    error: 'Trop de demandes. Attendez avant de demander un nouveau code.'
                }, { status: 429 });
            }

            return json({
                error: 'Erreur lors de l\'envoi du code. Veuillez réessayer.'
            }, { status: 500 });
        }

        console.log('✅ Nouvel OTP envoyé à:', session.user.email);

        return json({
            success: true,
            message: 'Code de vérification renvoyé avec succès'
        });

    } catch (error) {
        console.error('🚨 Erreur critique lors du renvoi OTP:', error);
        return json({
            error: 'Erreur serveur. Veuillez réessayer.'
        }, { status: 500 });
    }
};
