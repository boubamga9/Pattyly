/**
 * Utilitaires pour le système de transfert de boutiques
 * Permet de détecter les emails de transfert et valider les données
 */

/**
 * Détecte si un email est un email de transfert (pattyly.saas+[alias]@gmail.com)
 */
export const isTransferEmail = (email: string): boolean => {
    if (!email || typeof email !== 'string') return false;
    return email.startsWith('pattyly.saas+') && email.endsWith('@gmail.com');
};

/**
 * Extrait l'alias d'un email de transfert
 * @param email - Email de transfert (pattyly.saas+[alias]@gmail.com)
 * @returns L'alias extrait ou une chaîne vide
 */
export const extractAlias = (email: string): string => {
    if (!isTransferEmail(email)) return '';
    return email.replace('pattyly.saas+', '').replace('@gmail.com', '');
};

/**
 * Valide le format d'un PayPal.me
 * @param paypalMe - Le PayPal.me à valider
 * @returns true si valide, false sinon
 */
export const validatePayPalMe = (paypalMe: string): boolean => {
    if (!paypalMe || typeof paypalMe !== 'string') return false;

    // PayPal.me doit être alphanumérique, peut contenir des tirets et underscores
    // Longueur entre 3 et 20 caractères
    const paypalMeRegex = /^[a-zA-Z0-9_-]{3,20}$/;
    return paypalMeRegex.test(paypalMe);
};

/**
 * Valide le format d'un email
 * @param email - L'email à valider
 * @returns true si valide, false sinon
 */
export const validateEmail = (email: string): boolean => {
    if (!email || typeof email !== 'string') return false;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

/**
 * Valide les données d'un transfert
 * @param targetEmail - Email de destination
 * @param paypalMe - PayPal.me de la pâtissière
 * @returns Objet avec isValid et errorMessage
 */
export const validateTransferData = (targetEmail: string, paypalMe: string): {
    isValid: boolean;
    errorMessage?: string;
} => {
    if (!validateEmail(targetEmail)) {
        return {
            isValid: false,
            errorMessage: 'Format email invalide'
        };
    }

    if (!validatePayPalMe(paypalMe)) {
        return {
            isValid: false,
            errorMessage: 'Format PayPal.me invalide (3-20 caractères, lettres, chiffres, tirets et underscores uniquement)'
        };
    }

    return { isValid: true };
};

/**
 * Génère un message d'erreur personnalisé pour les transferts
 */
export const getTransferErrorMessage = (error: any): string => {
    if (typeof error === 'string') return error;

    // Erreurs PostgreSQL communes
    if (error?.code === '23505') {
        return 'Un transfert existe déjà pour cet email';
    }

    if (error?.code === '23503') {
        return 'Boutique introuvable';
    }

    return 'Erreur lors de la création du transfert';
};
