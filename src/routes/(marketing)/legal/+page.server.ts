import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
    return {
        // Pas de données dynamiques nécessaires pour les mentions légales
        // Le contenu est statique et défini dans le composant Svelte
    };
};
