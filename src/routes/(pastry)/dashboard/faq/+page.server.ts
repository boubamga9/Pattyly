import { error as svelteError, redirect } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import type { PageServerLoad, Actions } from './$types';
import { getUserPermissions } from '$lib/auth';
import { formSchema } from './schema';
import { forceRevalidateShop } from '$lib/utils/catalog';

export const load: PageServerLoad = async ({ locals }) => {
    const { data: { user } } = await locals.supabase.auth.getUser();

    if (!user) {
        throw redirect(302, '/login');
    }

    // ✅ OPTIMISÉ : Un seul appel DB pour toutes les données FAQ
    const { data: faqData, error } = await locals.supabase.rpc('get_faq_data', {
        p_profile_id: user.id
    });

    if (error) {
        console.error('Error fetching FAQ data:', error);
        throw svelteError(500, 'Erreur lors du chargement des données');
    }

    const { faqs } = faqData;

    return {
        faqs: faqs || [],
        form: await superValidate(zod(formSchema), {
            defaults: {
                question: '',
                answer: ''
            }
        })
    };
};

export const actions: Actions = {
    create: async ({ request, locals }) => {
        const { data: { user } } = await locals.supabase.auth.getUser();

        if (!user) {
            throw error(401, 'Non autorisé');
        }

        const permissions = await getUserPermissions(user.id, locals.supabase);


        if (!permissions.shopId || !permissions.shopSlug) {
            throw error(400, 'Boutique non trouvée');
        }

        const formData = await request.formData();
        const question = formData.get('question') as string;
        const answer = formData.get('answer') as string;

        if (!question || !answer) {
            throw error(400, 'Question et réponse requises');
        }

        const { error: createError } = await locals.supabase
            .from('faq')
            .insert({
                shop_id: permissions.shopId,
                question,
                answer
            });

        if (createError) {
            throw error(500, 'Erreur lors de la création de la FAQ');
        }
        await forceRevalidateShop(permissions.shopSlug);

        // Retourner le formulaire pour Superforms
        const form = await superValidate(zod(formSchema));
        form.message = 'FAQ créée avec succès !';
        return { form };
    },

    update: async ({ request, locals }) => {
        const { data: { user } } = await locals.supabase.auth.getUser();

        if (!user) {
            throw error(401, 'Non autorisé');
        }

        const permissions = await getUserPermissions(user.id, locals.supabase);


        if (!permissions.shopId || !permissions.shopSlug) {
            throw error(400, 'Boutique non trouvée');
        }

        const formData = await request.formData();
        const id = formData.get('id') as string;
        const question = formData.get('question') as string;
        const answer = formData.get('answer') as string;

        if (!id || !question || !answer) {
            throw error(400, 'ID, question et réponse requises');
        }

        const { error: updateError } = await locals.supabase
            .from('faq')
            .update({
                question,
                answer,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .eq('shop_id', permissions.shopId);

        if (updateError) {
            throw error(500, 'Erreur lors de la mise à jour de la FAQ');
        }

        await forceRevalidateShop(permissions.shopSlug);

        // Retourner le formulaire pour Superforms
        const form = await superValidate(zod(formSchema));
        form.message = 'FAQ mise à jour avec succès !';
        return { form };
    },

    delete: async ({ request, locals }) => {
        const { data: { user } } = await locals.supabase.auth.getUser();

        if (!user) {
            throw error(401, 'Non autorisé');
        }

        const permissions = await getUserPermissions(user.id, locals.supabase);


        if (!permissions.shopId || !permissions.shopSlug) {
            throw error(400, 'Boutique non trouvée');
        }

        const formData = await request.formData();
        const id = formData.get('id') as string;

        if (!id) {
            throw error(400, 'ID requis');
        }

        const { error: deleteError } = await locals.supabase
            .from('faq')
            .delete()
            .eq('id', id)
            .eq('shop_id', permissions.shopId);

        if (deleteError) {
            throw error(500, 'Erreur lors de la suppression de la FAQ');
        }

        await forceRevalidateShop(permissions.shopSlug);

        // Retourner le formulaire pour Superforms
        const form = await superValidate(zod(formSchema));
        form.message = 'FAQ supprimée avec succès !';
        return { form };
    }
}; 