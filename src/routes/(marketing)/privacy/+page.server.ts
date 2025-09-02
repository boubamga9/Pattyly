import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
    return {
        // Pas de données dynamiques nécessaires pour la politique de confidentialité
        // Le contenu est statique et défini dans le composant Svelte
    };
};
