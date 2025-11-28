import { error as svelteError, redirect, fail } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import type { PageServerLoad, Actions } from './$types';
import { verifyShopOwnership } from '$lib/auth';
import { addUnavailabilityFormSchema } from './schema';

export const load: PageServerLoad = async ({ locals, parent }) => {
    // ✅ OPTIMISÉ : Réutiliser user, permissions et shop du layout
    const { user, permissions, shop } = await parent();

    if (!user) {
        throw redirect(302, '/login');
    }

    if (!permissions.shopId || !shop) {
        throw svelteError(400, 'Boutique non trouvée');
    }

    // ✅ OPTIMISÉ : Un seul appel DB pour toutes les données disponibilités
    const { data: availabilityData, error } = await locals.supabase.rpc('get_availability_data', {
        p_profile_id: user.id
    });

    if (error) {
        console.error('Error fetching availability data:', error);
        throw svelteError(500, 'Erreur lors du chargement des données');
    }

    const { availabilities, unavailabilities, shopId } = availabilityData;

    if (!shopId) {
        throw svelteError(400, 'Boutique non trouvée');
    }

    return {
        availabilities: availabilities || [],
        unavailabilities: unavailabilities || [],
        shopId: shopId,
        shopSlug: permissions.shopSlug || shop.slug,
        form: await superValidate(zod(addUnavailabilityFormSchema), {
            defaults: {
                startDate: '',
                endDate: ''
            }
        })
    };
};

export const actions: Actions = {
    updateAvailability: async ({ request, locals }) => {
        // ✅ OPTIMISÉ : Lire formData AVANT superValidate (car superValidate consomme le body)
        const formData = await request.formData();
        const shopId = formData.get('shopId') as string;
        const availabilityId = formData.get('availabilityId') as string;

        if (!shopId || !availabilityId) {
            const form = await superValidate(zod(addUnavailabilityFormSchema));
            form.message = 'Données manquantes';
            return fail(400, { form });
        }

        // ✅ OPTIMISÉ : Utiliser safeGetSession au lieu de getUser()
        const { session } = await locals.safeGetSession();
        const userId = session?.user.id;

        if (!userId) {
            throw svelteError(401, 'Non autorisé');
        }

        // ✅ OPTIMISÉ : Vérifier la propriété avec verifyShopOwnership (remplace la vérification manuelle)
        const isOwner = await verifyShopOwnership(userId, shopId, locals.supabase);
        if (!isOwner) {
            throw svelteError(403, 'Accès non autorisé à cette boutique');
        }

        // Vérifier que l'availability appartient bien à ce shop (sécurité supplémentaire)
        const { data: availability } = await locals.supabase
            .from('availabilities')
            .select('shop_id')
            .eq('id', availabilityId)
            .single();

        if (!availability || availability.shop_id !== shopId) {
            throw svelteError(404, 'Disponibilité non trouvée');
        }

        const isAvailableRaw = formData.get('isAvailable') as string;
        const isAvailable = isAvailableRaw === 'true';
        const dailyOrderLimitRaw = formData.get('dailyOrderLimit') as string;
        const dailyOrderLimit = dailyOrderLimitRaw ? parseInt(dailyOrderLimitRaw) : null;
        const startTime = formData.get('startTime') as string || null;
        const endTime = formData.get('endTime') as string || null;
        const intervalTime = formData.get('intervalTime') as string || null;

        // Update availability
        const { error: updateError } = await locals.supabase
            .from('availabilities')
            .update({
                is_open: isAvailable,
                daily_order_limit: dailyOrderLimit,
                start_time: startTime,
                end_time: endTime,
                interval_time: intervalTime
            })
            .eq('id', availabilityId);

        if (updateError) {
            const form = await superValidate(zod(addUnavailabilityFormSchema));
            form.message = 'Erreur lors de la mise à jour';
            return fail(500, { form });
        }

        // Retourner le formulaire pour Superforms
        const form = await superValidate(zod(addUnavailabilityFormSchema));
        form.message = 'Disponibilité mise à jour avec succès !';
        return { form };
    },

    addUnavailability: async ({ request, locals }) => {
        // ✅ OPTIMISÉ : Lire formData AVANT superValidate (car superValidate consomme le body)
        const formData = await request.formData();
        const shopId = formData.get('shopId') as string;

        if (!shopId) {
            const form = await superValidate(zod(addUnavailabilityFormSchema));
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

        // Valider le formulaire avec Superforms (passer formData au lieu de request)
        const form = await superValidate(formData, zod(addUnavailabilityFormSchema));

        if (!form.valid) {
            return fail(400, { form });
        }

        // Récupérer les périodes existantes pour la validation des chevauchements
        const { data: existingUnavailabilities } = await locals.supabase
            .from('unavailabilities')
            .select('start_date, end_date')
            .eq('shop_id', shopId);

        // Valider avec le schéma étendu (incluant les chevauchements)
        const validationForm = await superValidate(
            { ...form.data, existingUnavailabilities: existingUnavailabilities || [] },
            zod(addUnavailabilityFormSchema)
        );

        if (!validationForm.valid) {
            return fail(400, { form: validationForm });
        }

        // Add unavailability
        const { error: insertError } = await locals.supabase
            .from('unavailabilities')
            .insert({
                shop_id: shopId,
                start_date: form.data.startDate,
                end_date: form.data.endDate
            });

        if (insertError) {
            const errorForm = await superValidate(zod(addUnavailabilityFormSchema));
            errorForm.message = 'Erreur lors de l\'ajout de l\'indisponibilité';
            return fail(500, { form: errorForm });
        }

        // Retourner le formulaire pour Superforms
        form.message = 'Indisponibilité ajoutée avec succès !';
        return { form };
    },

    deleteUnavailability: async ({ request, locals }) => {
        // ✅ OPTIMISÉ : Lire formData AVANT superValidate (car superValidate consomme le body)
        const formData = await request.formData();
        const shopId = formData.get('shopId') as string;
        const unavailabilityId = formData.get('unavailabilityId') as string;

        if (!shopId || !unavailabilityId) {
            const form = await superValidate(zod(addUnavailabilityFormSchema));
            form.message = 'Données manquantes';
            return fail(400, { form });
        }

        // ✅ OPTIMISÉ : Utiliser safeGetSession au lieu de getUser()
        const { session } = await locals.safeGetSession();
        const userId = session?.user.id;

        if (!userId) {
            throw svelteError(401, 'Non autorisé');
        }

        // ✅ OPTIMISÉ : Vérifier la propriété avec verifyShopOwnership (remplace la vérification manuelle)
        const isOwner = await verifyShopOwnership(userId, shopId, locals.supabase);
        if (!isOwner) {
            throw svelteError(403, 'Accès non autorisé à cette boutique');
        }

        // Vérifier que l'unavailability appartient bien à ce shop (sécurité supplémentaire)
        const { data: unavailability } = await locals.supabase
            .from('unavailabilities')
            .select('shop_id')
            .eq('id', unavailabilityId)
            .single();

        if (!unavailability || unavailability.shop_id !== shopId) {
            throw svelteError(404, 'Indisponibilité non trouvée');
        }

        // Delete unavailability
        const { error: deleteError } = await locals.supabase
            .from('unavailabilities')
            .delete()
            .eq('id', unavailabilityId);

        if (deleteError) {
            const form = await superValidate(zod(addUnavailabilityFormSchema));
            form.message = 'Erreur lors de la suppression';
            return fail(500, { form });
        }

        // Retourner le formulaire pour Superforms
        const form = await superValidate(zod(addUnavailabilityFormSchema));
        form.message = 'Indisponibilité supprimée avec succès !';
        return { form };
    }
};