import { Resend } from 'resend';
import { env } from '$env/dynamic/private';

const resend = new Resend(env.RESEND_API_KEY);

export interface ResendContactData {
    email: string;
    current_plan?: string;
    visible_in_listing_page?: boolean; // Sera converti en number (0/1) avant envoi
    shop_name?: string;
    shop_slug?: string;
    unsubscribed?: boolean;
}

export class ResendContactsService {
    /**
     * Crée ou met à jour un contact dans Resend avec ses propriétés personnalisées
     * Fonctionne même si le contact existe déjà (ajouté manuellement)
     */
    static async upsertContact(data: ResendContactData) {
        try {
            // Préparer les propriétés personnalisées
            // Note: Resend attend visible_in_listing_page comme number (0 ou 1), pas boolean
            const properties: Record<string, string | number> = {};

            if (data.current_plan !== undefined) {
                properties.current_plan = data.current_plan;
            }
            if (data.visible_in_listing_page !== undefined) {
                // Convertir boolean en number pour Resend (0 = false, 1 = true)
                properties.visible_in_listing_page = data.visible_in_listing_page ? 1 : 0;
            }
            if (data.shop_name !== undefined) {
                properties.shop_name = data.shop_name;
            }
            if (data.shop_slug !== undefined) {
                properties.shop_slug = data.shop_slug;
            }

            // Resend.update fonctionne même si le contact n'existe pas encore
            // Il le créera automatiquement si nécessaire
            const { data: contact, error } = await resend.contacts.update({
                email: data.email,
                unsubscribed: data.unsubscribed ?? false,
                properties: Object.keys(properties).length > 0 ? properties : undefined,
            });

            if (error) {
                // Si le contact n'existe pas, le créer
                if (error.message?.includes('not found')) {
                    const { data: newContact, error: createError } = await resend.contacts.create({
                        email: data.email,
                        unsubscribed: data.unsubscribed ?? false,
                    });

                    if (createError) {
                        console.error('Erreur création contact Resend:', createError);
                        throw createError;
                    }

                    // Mettre à jour les propriétés après création
                    if (Object.keys(properties).length > 0) {
                        await resend.contacts.update({
                            email: data.email,
                            properties,
                        });
                    }

                    return { success: true, contact: newContact };
                }

                console.error('Erreur mise à jour contact Resend:', error);
                throw error;
            }

            return { success: true, contact };
        } catch (error) {
            console.error('Erreur ResendContactsService.upsertContact:', error);
            // Ne pas faire échouer l'opération principale si Resend échoue
            return { success: false, error };
        }
    }

    /**
     * Supprime un contact de Resend
     * Utilisé lors de la suppression de compte utilisateur
     */
    static async deleteContact(email: string) {
        try {
            // Resend accepte soit une string (email) soit un objet { email: string }
            const { data, error } = await resend.contacts.remove({
                email: email,
            });

            if (error) {
                // Si le contact n'existe pas, ce n'est pas une erreur critique
                if (error.message?.includes('not found')) {
                    console.log(`Contact Resend non trouvé pour suppression: ${email}`);
                    return { success: true, message: 'Contact non trouvé (déjà supprimé ou n\'existe pas)' };
                }

                console.error('Erreur suppression contact Resend:', error);
                throw error;
            }

            return { success: true, data };
        } catch (error) {
            console.error('Erreur ResendContactsService.deleteContact:', error);
            // Ne pas faire échouer l'opération principale si Resend échoue
            return { success: false, error };
        }
    }
}

