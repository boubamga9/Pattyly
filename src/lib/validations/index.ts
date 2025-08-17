/**
 * Export centralisé de tous les schémas de validation
 * 
 * Ce fichier permet d'importer facilement tous les schémas
 * depuis un seul endroit : import { ... } from '$lib/validations'
 */

// ===== SCHÉMAS COMMUNS =====
export * from './schemas/common';

// ===== AUTHENTIFICATION =====
export * from './schemas/auth';

// ===== FORMULAIRES DE PERSONNALISATION =====
export * from './schemas/form';

// ===== CONFIGURATION DES BOUTIQUES =====
export * from './schemas/shop';

// ===== CATÉGORIES DE PRODUITS =====
export * from './schemas/category';

// ===== PRODUITS =====
export * from './schemas/product';

// ===== COMMANDES ET DEVIS =====
export * from './schemas/order';

// ===== FORMULAIRE DE CONTACT =====
export * from './schemas/contact';

// ===== GESTION DES DISPONIBILITÉS =====
export * from './schemas/availability';

// ===== FAQ =====
export * from './schemas/faq';
