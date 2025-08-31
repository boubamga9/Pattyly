/**
 * Liste des domaines d'emails jetables interdits
 * 
 * Cette liste contient les domaines d'emails temporaires les plus courants
 * utilisés par les fraudeurs pour contourner les vérifications.
 * 
 * Mise à jour : Ajouter de nouveaux domaines au début de la liste
 * pour faciliter la maintenance.
 */

export const BLOCKED_EMAIL_DOMAINS = [
    // Services temporaires populaires
    '10minutemail.com',
    '10minutemail.net',
    'tempmail.org',
    'guerrillamail.com',
    'mailinator.com',
    'yopmail.com',
    'throwaway.email',
    'temp-mail.org',
    'sharklasers.com',
    'grr.la',

    // Services français
    'yopmail.fr',
    'yopmail.net',
    'yopmail.org',

    // Services génériques
    'mailnesia.com',
    'maildrop.cc',
    'getairmail.com',
    'mailmetrash.com',
    'mailcatch.com',
    'spam4.me',
    'bccto.me',
    'chacuo.net',

    // Services récents
    'tempmailaddress.com',
    'mailtemp.net',
    'fakeinbox.com',
    'fakeinbox.net',
    'getnada.com',
    'mailnesia.com',
    'maildrop.cc',
    'getairmail.com',
    'mailmetrash.com',
    'mailcatch.com',
    'spam4.me',
    'bccto.me',
    'chacuo.net',

    // Services additionnels
    'tempr.email',
    'tmpmail.org',
    'mail.tm',
    'nwytg.net',
    'mail.gw',
    'mailnesia.com',
    'maildrop.cc',
    'getairmail.com',
    'mailmetrash.com',
    'mailcatch.com',
    'spam4.me',
    'bccto.me',
    'chacuo.net'
] as const;

// Type pour TypeScript
export type BlockedEmailDomain = typeof BLOCKED_EMAIL_DOMAINS[number];
