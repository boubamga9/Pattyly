import { z } from 'zod';
import { BLOCKED_EMAIL_DOMAINS } from '$lib/config/blocked-emails';

/**
 * Schémas de validation communs réutilisables dans toute l'application
 * Ces schémas sont utilisés côté client ET serveur pour la cohérence
 */

// ===== CHAMPS DE BASE =====

// Email - utilisé partout (auth, contact, commandes)
// Inclut la validation anti-jetable pour bloquer les emails temporaires
export const emailSchema = z
    .string()
    .min(1, 'L\'email est requis')
    .email('Format d\'email invalide')
    .refine((email) => {
        const domain = email.split('@')[1]?.toLowerCase();
        return !BLOCKED_EMAIL_DOMAINS.includes(domain as any);
    }, 'Les emails temporaires ne sont pas autorisés. Veuillez utiliser une adresse email permanente.');

// Mot de passe - avec validation de sécurité renforcée
export const passwordSchema = z
    .string()
    .min(8, 'Le mot de passe doit faire au moins 8 caractères')
    .max(128, 'Le mot de passe ne peut pas dépasser 128 caractères')
    .regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une majuscule')
    .regex(/[a-z]/, 'Le mot de passe doit contenir au moins une minuscule')
    .regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre')
    .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 'Le mot de passe doit contenir au moins un caractère spécial');

// Nom - pour les personnes (lettres et espaces uniquement)
export const nameSchema = z
    .string()
    .min(2, 'Le nom doit faire au moins 2 caractères')
    .max(50, 'Le nom ne peut pas dépasser 50 caractères')
    .regex(/^[A-Za-zÀ-ÿ]+(\s[A-Za-zÀ-ÿ]+)*$/, 'Le nom ne peut contenir que des lettres et espaces, avec un seul espace entre chaque mot')
    .trim();

// Nom de boutique - pour les entités commerciales
export const shopNameSchema = z
    .string()
    .min(2, 'Le nom de boutique doit faire au moins 2 caractères')
    .max(50, 'Le nom de boutique ne peut pas dépasser 50 caractères')
    .regex(/^[A-Za-zÀ-ÿ0-9'-]+(\s[A-Za-zÀ-ÿ0-9'-]+)*$/, 'Le nom de boutique ne peut contenir que des lettres, chiffres, tirets, apostrophes et espaces, avec un seul espace entre chaque mot')
    .trim();

// Nom de produit - pour les produits de pâtisserie (sans chiffres)
export const productNameSchema = z
    .string()
    .min(2, 'Le nom du produit doit faire au moins 2 caractères')
    .max(50, 'Le nom du produit ne peut pas dépasser 50 caractères')
    .regex(/^[A-Za-zÀ-ÿ'-]+(\s[A-Za-zÀ-ÿ'-]+)*$/, 'Le nom du produit ne peut contenir que des lettres, tirets, apostrophes et espaces, avec un seul espace entre chaque mot')
    .trim();

// Description - pour les textes longs optionnels (avec protection XSS)
export const descriptionSchema = z
    .string()
    .max(1000, 'La description ne peut pas dépasser 1000 caractères')
    .regex(/^[^<>{}[\]\\\/`;]*$/, 'La description ne peut pas contenir ces caractères spéciaux (<, >, {, }, [, ], \\, /, `, ;)')
    .trim()
    .optional();

// Message - pour les communications
export const messageSchema = z
    .string()
    .max(500, 'Le message ne peut pas dépasser 500 caractères')
    .trim()
    .optional();

// ===== CHAMPS SPÉCIALISÉS =====

// Slug - pour les URLs de boutique
export const slugSchema = z
    .string()
    .min(3, 'Le slug doit faire au moins 3 caractères')
    .max(50, 'Le slug ne peut pas dépasser 50 caractères')
    .regex(/^[a-z0-9-]+$/, 'Le slug ne peut contenir que des lettres minuscules, chiffres et tirets')
    .transform(val => val.toLowerCase());

// Prix - pour les montants monétaires
export const priceSchema = z.preprocess(
    (val) => {
        // Convertir string → number avant validation
        if (typeof val === 'string') {
            const num = parseFloat(val);
            return isNaN(num) ? val : num; // Retourner val si pas un nombre pour que Zod gère l'erreur
        }
        return val;
    },
    z.number({
        required_error: 'Le prix est requis',
        invalid_type_error: 'Le prix doit être un nombre'
    }).min(0, 'Le prix doit être positif').max(10000, 'Le prix ne peut pas dépasser 10 000€')
);

// Code OTP - pour la vérification par code à 6 chiffres
export const otpCodeSchema = z
    .string()
    .regex(/^\d{6}$/, { message: 'Le code doit contenir exactement 6 chiffres' })

// UUID - pour les identifiants
export const uuidSchema = z
    .string()
    .uuid('Format d\'UUID invalide');

// Date future uniquement
// ✅ Changed to string to prevent timezone conversion (Date object causes one-day offset)
export const futureDateSchema = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide (YYYY-MM-DD attendu)')
    .refine(
        (dateStr) => {
            // Compare using midday UTC to avoid timezone issues
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const inputDate = new Date(dateStr + 'T12:00:00Z');
            return inputDate >= today;
        },
        'La date doit être aujourd\'hui ou dans le futur'
    );

// Créneau horaire - pour les heures de récupération
export const timeSlotSchema = z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/, '')
    .refine(
        (timeStr) => {
            // Extraire seulement les heures et minutes (ignorer les secondes si présentes)
            const timeParts = timeStr.split(':');
            const hours = parseInt(timeParts[0], 10);
            const minutes = parseInt(timeParts[1], 10);
            return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
        },
        'L\'heure de récupération est obligatoire'
    );

// Créneau horaire optionnel
export const optionalTimeSlotSchema = z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    timeSlotSchema.optional()
);

// Username pour réseaux sociaux (Instagram, TikTok)
export const socialUsernameSchema = z.preprocess(
    (val) => (val === "" ? undefined : val),
    z
        .string()
        .min(3, "Le nom d'utilisateur doit faire au moins 3 caractères")
        .max(30, "Le nom d'utilisateur ne peut pas dépasser 30 caractères")
        .regex(/^[a-zA-Z0-9._]+$/, "Le nom d'utilisateur ne peut contenir que des lettres, chiffres, points et tirets de soulignement")
        .optional()
);

// URL - pour les liens et images
export const urlSchema = z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.string()
        .url('Format d\'URL invalide')
        .optional()
);

// Texte sécurisé pour les FAQ - sans caractères spéciaux problématiques
export const secureTextSchema = z
    .string()
    .min(1, 'Le texte est requis')
    .transform((text) => {
        // Supprimer les caractères de contrôle et les espaces multiples
        return text
            .replace(/[\x00-\x1F\x7F]/g, '') // Caractères de contrôle
            .replace(/\s+/g, ' ') // Espaces multiples
            .trim();
    })
    .refine(
        (text) => !/[<>"&\\]/.test(text),
        'Le texte ne peut pas contenir les caractères suivants : < > " \\'
    );

// Texte sécurisé pour les FAQ - permet les apostrophes (très courantes en français)
export const faqTextSchema = z
    .string()
    .min(1, 'Le texte est requis')
    .transform((text) => {
        // Supprimer les caractères de contrôle et les espaces multiples
        return text
            .replace(/[\x00-\x1F\x7F]/g, '') // Caractères de contrôle
            .replace(/\s+/g, ' ') // Espaces multiples
            .trim();
    })
    .refine(
        (text) => !/[<>"&\\]/.test(text),
        'Le texte ne peut pas contenir les caractères suivants : < > " \\'
    );

// ===== TYPES EXPORTÉS =====

export type Email = z.infer<typeof emailSchema>;
export type Password = z.infer<typeof passwordSchema>;
export type Name = z.infer<typeof nameSchema>;
export type ShopName = z.infer<typeof shopNameSchema>;
export type ProductName = z.infer<typeof productNameSchema>;
export type Description = z.infer<typeof descriptionSchema>;
export type Message = z.infer<typeof messageSchema>;
export type Slug = z.infer<typeof slugSchema>;
export type Price = z.infer<typeof priceSchema>;
export type URL = z.infer<typeof urlSchema>;
export type UUID = z.infer<typeof uuidSchema>;
export type FutureDate = z.infer<typeof futureDateSchema>;
export type TimeSlot = z.infer<typeof timeSlotSchema>;
export type SocialUsername = z.infer<typeof socialUsernameSchema>;
export type SecureText = z.infer<typeof secureTextSchema>;
export type FaqText = z.infer<typeof faqTextSchema>;
