import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
    try {
        const { email } = await request.json();

        if (!email) {
            return json({ error: 'Email requis' }, { status: 400 });
        }

        // Utiliser Supabase pour renvoyer l'email de confirmation
        const { data, error } = await locals.supabase.auth.resend({
            type: 'signup',
            email: email
        });

        if (error) {
            console.error('🚨 Erreur lors du renvoi:', error);

            if (error.message.includes('Too many requests')) {
                return json({
                    error: 'Trop de demandes. Attendez avant de demander un nouveau lien.'
                }, { status: 429 });
            }

            return json({
                error: 'Erreur lors de l\'envoi. Veuillez réessayer.'
            }, { status: 500 });
        }

        console.log('✅ Nouvel email de confirmation envoyé à:', email);

        return json({
            success: true,
            message: 'Email de confirmation renvoyé avec succès'
        });

    } catch (error) {
        console.error('🚨 Erreur critique lors du renvoi:', error);
        return json({
            error: 'Erreur serveur. Veuillez réessayer.'
        }, { status: 500 });
    }
};
