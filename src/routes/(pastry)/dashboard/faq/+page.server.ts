import { error as svelteError, redirect, fail } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import type { PageServerLoad, Actions } from './$types';
import { verifyShopOwnership } from '$lib/auth';
import { formSchema } from './schema';
import { forceRevalidateShop } from '$lib/utils/catalog';

export const load: PageServerLoad = async ({ locals, parent }) => {
    // ✅ OPTIMISÉ : Réutiliser les permissions et shop du layout
    const { user, permissions, shop } = await parent();

    if (!user) {
        throw redirect(302, '/login');
    }

    if (!permissions.shopId || !shop) {
        throw svelteError(400, 'Boutique non trouvée');
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
        shopId: permissions.shopId,
        shopSlug: permissions.shopSlug || shop.slug,
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
        // ✅ OPTIMISÉ : Lire formData AVANT superValidate (car superValidate consomme le body)
        const formData = await request.formData();
        const shopId = formData.get('shopId') as string;
        const shopSlug = formData.get('shopSlug') as string;

        if (!shopId || !shopSlug) {
            const form = await superValidate(zod(formSchema));
            form.message = 'Données de boutique manquantes';
            return fail(400, { form });
        }

        // ✅ OPTIMISÉ : Utiliser safeGetSession au lieu de getUser()
        const { session } = await locals.safeGetSession();
        const userId = session?.user.id;

        if (!userId) {
            throw svelteError(401, 'Non autorisé');
        }

        // ✅ OPTIMISÉ : Vérifier la propriété avec verifyShopOwnership (évite getUserPermissions + requête shop)
        const isOwner = await verifyShopOwnership(userId, shopId, locals.supabase);
        if (!isOwner) {
            throw svelteError(403, 'Accès non autorisé à cette boutique');
        }

        const question = formData.get('question') as string;
        const answer = formData.get('answer') as string;

        if (!question || !answer) {
            const form = await superValidate(zod(formSchema));
            form.message = 'Question et réponse requises';
            return fail(400, { form });
        }

        const { error: createError } = await locals.supabase
            .from('faq')
            .insert({
                shop_id: shopId,
                question,
                answer
            });

        if (createError) {
            const form = await superValidate(zod(formSchema));
            form.message = 'Erreur lors de la création de la FAQ';
            return fail(500, { form });
        }

        await forceRevalidateShop(shopSlug);

        // Retourner le formulaire pour Superforms
        const form = await superValidate(zod(formSchema));
        form.message = 'FAQ créée avec succès !';
        return { form };
    },

    update: async ({ request, locals }) => {
        // ✅ OPTIMISÉ : Lire formData AVANT superValidate (car superValidate consomme le body)
        const formData = await request.formData();
        const shopId = formData.get('shopId') as string;
        const shopSlug = formData.get('shopSlug') as string;

        if (!shopId || !shopSlug) {
            const form = await superValidate(zod(formSchema));
            form.message = 'Données de boutique manquantes';
            return fail(400, { form });
        }

        // ✅ OPTIMISÉ : Utiliser safeGetSession au lieu de getUser()
        const { session } = await locals.safeGetSession();
        const userId = session?.user.id;

        if (!userId) {
            throw svelteError(401, 'Non autorisé');
        }

        // ✅ OPTIMISÉ : Vérifier la propriété avec verifyShopOwnership (évite getUserPermissions + requête shop)
        const isOwner = await verifyShopOwnership(userId, shopId, locals.supabase);
        if (!isOwner) {
            throw svelteError(403, 'Accès non autorisé à cette boutique');
        }

        const id = formData.get('id') as string;
        const question = formData.get('question') as string;
        const answer = formData.get('answer') as string;

        if (!id || !question || !answer) {
            const form = await superValidate(zod(formSchema));
            form.message = 'ID, question et réponse requises';
            return fail(400, { form });
        }

        const { error: updateError } = await locals.supabase
            .from('faq')
            .update({
                question,
                answer,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .eq('shop_id', shopId);

        if (updateError) {
            const form = await superValidate(zod(formSchema));
            form.message = 'Erreur lors de la mise à jour de la FAQ';
            return fail(500, { form });
        }

        await forceRevalidateShop(shopSlug);

        // Retourner le formulaire pour Superforms
        const form = await superValidate(zod(formSchema));
        form.message = 'FAQ mise à jour avec succès !';
        return { form };
    },

    delete: async ({ request, locals }) => {
        // ✅ OPTIMISÉ : Lire formData AVANT superValidate (car superValidate consomme le body)
        const formData = await request.formData();
        const shopId = formData.get('shopId') as string;
        const shopSlug = formData.get('shopSlug') as string;

        if (!shopId || !shopSlug) {
            const form = await superValidate(zod(formSchema));
            form.message = 'Données de boutique manquantes';
            return fail(400, { form });
        }

        // ✅ OPTIMISÉ : Utiliser safeGetSession au lieu de getUser()
        const { session } = await locals.safeGetSession();
        const userId = session?.user.id;

        if (!userId) {
            throw svelteError(401, 'Non autorisé');
        }

        // ✅ OPTIMISÉ : Vérifier la propriété avec verifyShopOwnership (évite getUserPermissions + requête shop)
        const isOwner = await verifyShopOwnership(userId, shopId, locals.supabase);
        if (!isOwner) {
            throw svelteError(403, 'Accès non autorisé à cette boutique');
        }

        const id = formData.get('id') as string;

        if (!id) {
            const form = await superValidate(zod(formSchema));
            form.message = 'ID requis';
            return fail(400, { form });
        }

        const { error: deleteError } = await locals.supabase
            .from('faq')
            .delete()
            .eq('id', id)
            .eq('shop_id', shopId);

        if (deleteError) {
            const form = await superValidate(zod(formSchema));
            form.message = 'Erreur lors de la suppression de la FAQ';
            return fail(500, { form });
        }

        await forceRevalidateShop(shopSlug);

        // Retourner le formulaire pour Superforms
        const form = await superValidate(zod(formSchema));
        form.message = 'FAQ supprimée avec succès !';
        return { form };
    }
};
