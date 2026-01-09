import { ResendContactsService } from '$lib/services/resend-contacts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
    const email = url.searchParams.get('email');
    
    if (!email) {
        return {
            success: false,
            message: 'Email manquant dans l\'URL'
        };
    }

    // Valider le format de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return {
            success: false,
            message: 'Format d\'email invalide'
        };
    }

    try {
        // Marquer comme désabonné dans Resend
        const result = await ResendContactsService.upsertContact({
            email,
            unsubscribed: true
        });

        if (result.success) {
            return {
                success: true,
                message: 'Vous avez été désabonné avec succès. Vous ne recevrez plus d\'emails marketing de notre part.',
                email
            };
        } else {
            return {
                success: false,
                message: 'Une erreur est survenue lors du désabonnement. Veuillez réessayer plus tard.'
            };
        }
    } catch (error) {
        console.error('Erreur désabonnement:', error);
        return {
            success: false,
            message: 'Une erreur est survenue. Veuillez réessayer plus tard.'
        };
    }
};

