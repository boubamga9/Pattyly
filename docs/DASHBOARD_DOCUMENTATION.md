# Documentation - Section Dashboard

## 📋 Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture](#architecture)
3. [Structure des pages](#structure-des-pages)
4. [Détails par page](#détails-par-page)
5. [Patterns et conventions](#patterns-et-conventions)
6. [Guide de développement](#guide-de-développement)

---

## Vue d'ensemble

La section **Dashboard** est l'interface principale pour les pâtissiers (chefs) pour gérer leur boutique, leurs produits, leurs commandes et leurs paramètres. Elle est accessible uniquement aux utilisateurs authentifiés ayant complété l'onboarding.

### Fonctionnalités principales

- **Gestion de la boutique** : Informations, personnalisation visuelle, annuaire
- **Gestion des produits** : Création, modification, duplication, suppression de gâteaux
- **Gestion des commandes** : Suivi, devis, notes personnelles, statuts
- **Disponibilités** : Gestion des horaires et indisponibilités
- **Formulaires personnalisés** : Configuration des demandes personnalisées
- **FAQ** : Gestion des questions fréquentes
- **Paramètres** : Profil, mot de passe, transfert de boutique

---

## Architecture

### Hiérarchie des layouts

```
(pastry)/
├── +layout.server.ts          # Layout principal : permissions, shop, user
└── dashboard/
    ├── +layout.server.ts       # Layout dashboard : réutilise parent()
    └── [pages]/
        └── +page.server.ts    # Pages individuelles
```

### Flux de données

```
1. (pastry)/+layout.server.ts
   └── Charge : user, shop, permissions (via RPC get_user_permissions_complete)
   
2. dashboard/+layout.server.ts
   └── Réutilise : permissions, user (via parent())
   
3. dashboard/[page]/+page.server.ts
   └── Réutilise : permissions, shop, user (via parent())
   └── Charge : données spécifiques à la page
```

### Données disponibles dans toutes les pages

Grâce à la hiérarchie des layouts, toutes les pages du dashboard ont accès à :

```typescript
{
  user: User,              // Utilisateur connecté
  shop: Shop,              // Boutique de l'utilisateur
  permissions: {
    shopId: string,
    shopSlug: string,
    plan: 'free' | 'basic' | 'premium' | 'exempt',
    productCount: number,
    productLimit: number,
    canHandleCustomRequests: boolean,
    canManageCustomForms: boolean,
    isExempt: boolean
  },
  orderLimitStats: OrderLimitStats
}
```

---

## Structure des pages

### Organisation du code

```
dashboard/
├── +page.server.ts              # Page d'accueil : métriques, statistiques
├── shop/                        # Gestion de la boutique
│   ├── +page.server.ts
│   ├── +page.svelte
│   ├── shop-form.svelte
│   ├── customization-form.svelte
│   ├── customization-schema.ts
│   └── schema.ts
├── products/                    # Gestion des produits
│   ├── +page.server.ts          # Liste des produits
│   ├── +page.svelte
│   ├── [id]/                    # Édition d'un produit
│   │   ├── +page.server.ts
│   │   ├── +page.svelte
│   │   └── schema.ts
│   ├── new/                     # Création d'un produit
│   │   ├── +page.server.ts
│   │   ├── +page.svelte
│   │   └── schema.ts
│   ├── product-form.svelte      # Composant partagé
│   ├── category-form.svelte
│   └── schema.ts
├── orders/                      # Gestion des commandes
│   ├── +page.server.ts          # Liste des commandes
│   ├── +page.svelte
│   └── [id]/                    # Détail d'une commande
│       ├── +page.server.ts
│       ├── +page.svelte
│       ├── personal-note-form.svelte
│       ├── quote-form.svelte
│       ├── reject-form.svelte
│       └── schema.ts
├── availability/               # Disponibilités
│   ├── +page.server.ts
│   ├── +page.svelte
│   ├── availability-list.svelte
│   ├── unavailability-form.svelte
│   └── schema.ts
├── custom-form/                 # Formulaires personnalisés
│   ├── +page.server.ts
│   ├── +page.svelte
│   ├── toggle-form.svelte
│   ├── update-form.svelte
│   └── schema.ts
├── faq/                         # FAQ
│   ├── +page.server.ts
│   ├── +page.svelte
│   ├── faq-form.svelte
│   └── schema.ts
└── settings/                    # Paramètres
    ├── +page.server.ts
    ├── +page.svelte
    ├── change-password-form.svelte
    ├── create-password-form.svelte
    ├── delete-account-form.svelte
    └── schema.ts
```

---

## Détails par page

### 1. `/dashboard` - Page d'accueil

**Fichier** : `dashboard/+page.server.ts`

**Fonctionnalités** :
- Affichage des métriques (revenus, commandes, produits)
- Gâteaux populaires (top 5)
- Actions rapides (ajouter un gâteau, voir les commandes, etc.)
- URL de la boutique avec bouton de copie
- Bouton de transfert de boutique

**Load function** :
```typescript
export const load = async ({ locals, parent }) => {
    const { permissions, shop, user } = await parent();
    
    // Métriques via RPC
    const { data: ordersMetrics } = await locals.supabase.rpc('get_orders_metrics', {
        p_shop_id: shop.id
    });
    
    // Produits populaires
    const { data: popularProducts } = await locals.supabase
        .from('orders')
        .select('product_name, total_amount, status')
        .eq('shop_id', shop.id)
        .eq('status', 'completed');
    
    return { metrics, popularProducts, shop, permissions };
};
```

**Actions** :
- `createTransfer` : Création d'un transfert de boutique vers un autre utilisateur

**Composants** :
- `+page.svelte` : Page principale avec toutes les métriques et actions rapides

---

### 2. `/dashboard/shop` - Gestion de la boutique

**Fichier** : `dashboard/shop/+page.server.ts`

**Fonctionnalités** :
- Modification des informations de base (nom, description, etc.)
- Personnalisation visuelle (couleurs, image de fond)
- Configuration de l'annuaire (visibilité, informations)
- Toggle pour activer/désactiver l'annuaire

**Load function** :
- Charge les données de la boutique
- Charge les personnalisations visuelles
- Charge les paramètres de l'annuaire

**Actions** :
- `updateShop` : Mise à jour des informations de base
- `updateCustomizationForm` : Mise à jour de la personnalisation visuelle
- `removeBackgroundImage` : Suppression de l'image de fond
- `updateDirectory` : Mise à jour des paramètres de l'annuaire
- `toggleDirectory` : Activation/désactivation de l'annuaire

**Composants** :
- `shop-form.svelte` : Formulaire des informations de base
- `customization-form.svelte` : Formulaire de personnalisation visuelle
- `directory-form.svelte` : Formulaire de l'annuaire (composant partagé dans `lib/components/directory/`)

**Schémas** :
- `schema.ts` : Schémas pour les informations de base
- `customization-schema.ts` : Schémas pour la personnalisation

---

### 3. `/dashboard/products` - Liste des produits

**Fichier** : `dashboard/products/+page.server.ts`

**Fonctionnalités** :
- Affichage de tous les produits avec leurs catégories
- Actions : supprimer, dupliquer, modifier
- Gestion des catégories (créer, modifier, supprimer)
- Affichage de la limite de produits selon le plan

**Load function** :
- Utilise RPC `get_products_data` pour charger produits, catégories et shop en une seule requête
- Retourne les permissions pour vérifier la limite

**Actions** :
- `deleteProduct` : Suppression d'un produit (avec suppression de l'image si non utilisée)
- `duplicateProduct` : Duplication d'un produit (avec vérification de la limite)
- `createCategory` : Création d'une catégorie
- `updateCategory` : Modification d'une catégorie
- `deleteCategory` : Suppression d'une catégorie

**Composants** :
- `+page.svelte` : Liste des produits avec actions
- `category-form.svelte` : Formulaire pour créer/modifier une catégorie

**Limites de produits** :
- Plan gratuit : 3 produits
- Plan Starter : 10 produits
- Plan Premium : Illimité

---

### 4. `/dashboard/products/[id]` - Édition d'un produit

**Fichier** : `dashboard/products/[id]/+page.server.ts`

**Fonctionnalités** :
- Modification d'un produit existant
- Gestion des champs de personnalisation (création, modification, suppression)
- Upload d'image (Cloudinary)
- Création de catégorie inline

**Load function** :
- Charge le produit avec ses relations (catégorie, formulaire de personnalisation)
- Charge les catégories disponibles
- Charge les champs de personnalisation existants

**Actions** :
- `updateProduct` : Mise à jour du produit (avec gestion des champs de personnalisation)
- `createCategory` : Création d'une catégorie (inline)

**Composants** :
- `+page.svelte` : Page d'édition
- `product-form.svelte` : Formulaire partagé (utilisé aussi pour la création)

**Schémas** :
- `schema.ts` : Schémas pour la modification de produit

---

### 5. `/dashboard/products/new` - Création d'un produit

**Fichier** : `dashboard/products/new/+page.server.ts`

**Fonctionnalités** :
- Création d'un nouveau produit
- Vérification de la limite de produits selon le plan
- Gestion des champs de personnalisation
- Upload d'image (Cloudinary)
- Création de catégorie inline

**Load function** :
- Charge les catégories disponibles
- Retourne `shopId` et `shopSlug` pour le frontend

**Actions** :
- `createProduct` : Création du produit (avec vérification de limite)
- `createCategory` : Création d'une catégorie (inline)

**Composants** :
- `+page.svelte` : Page de création
- `product-form.svelte` : Formulaire partagé (utilisé aussi pour l'édition)

**Schémas** :
- `schema.ts` : Schémas pour la création de produit

**Limites** :
- Vérifie la limite avant de créer
- Bloque la création si la limite est atteinte

---

### 6. `/dashboard/orders` - Liste des commandes

**Fichier** : `dashboard/orders/+page.server.ts`

**Fonctionnalités** :
- Affichage de toutes les commandes
- Filtrage par statut
- Groupement par date de livraison
- Compteurs par statut

**Load function** :
- Utilise RPC `get_orders_data` pour charger toutes les commandes en une seule requête
- Groupe les commandes par date de livraison
- Compte les commandes par statut

**Actions** :
- Aucune action sur cette page (les actions sont sur la page de détail)

**Composants** :
- `+page.svelte` : Liste des commandes groupées par date

**Statuts possibles** :
- `pending` : En attente
- `confirmed` : Confirmée
- `quoted` : Devis envoyé
- `to_verify` : À vérifier
- `ready` : Prête
- `completed` : Terminée
- `cancelled` : Annulée

---

### 7. `/dashboard/orders/[id]` - Détail d'une commande

**Fichier** : `dashboard/orders/[id]/+page.server.ts`

**Fonctionnalités** :
- Affichage détaillé d'une commande
- Actions sur la commande (devis, rejet, confirmation, etc.)
- Notes personnelles (création, modification, suppression)
- Affichage des informations client
- Affichage des produits commandés

**Load function** :
- Utilise RPC `get_order_detail_data` pour charger toutes les données en une seule requête
- Retourne la commande avec toutes ses relations

**Actions** :
- `savePersonalNote` : Sauvegarde d'une note personnelle
- `makeQuote` : Création d'un devis (avec montant)
- `rejectOrder` : Rejet d'une commande (avec raison)
- `confirmPayment` : Confirmation du paiement
- `makeOrderReady` : Marquer comme prête
- `makeOrderCompleted` : Marquer comme terminée
- `cancelOrder` : Annuler une commande
- `deletePersonalNote` : Suppression d'une note personnelle

**Composants** :
- `+page.svelte` : Page de détail avec toutes les informations
- `personal-note-form.svelte` : Formulaire pour les notes personnelles
- `quote-form.svelte` : Formulaire pour créer un devis
- `reject-form.svelte` : Formulaire pour rejeter une commande

**Schémas** :
- `schema.ts` : Schémas pour toutes les actions

---

### 8. `/dashboard/availability` - Disponibilités

**Fichier** : `dashboard/availability/+page.server.ts`

**Fonctionnalités** :
- Gestion des horaires quotidiens (lundi à dimanche)
- Toggle pour activer/désactiver chaque jour
- Gestion des périodes d'indisponibilité (dates de début et fin)
- Affichage des disponibilités et indisponibilités

**Load function** :
- Charge les disponibilités quotidiennes
- Charge les périodes d'indisponibilité

**Actions** :
- `updateAvailability` : Mise à jour des horaires d'un jour
- `addUnavailability` : Ajout d'une période d'indisponibilité
- `deleteUnavailability` : Suppression d'une période d'indisponibilité

**Composants** :
- `+page.svelte` : Page principale
- `availability-list.svelte` : Liste des disponibilités avec toggles
- `unavailability-form.svelte` : Formulaire pour ajouter une indisponibilité

**Schémas** :
- `schema.ts` : Schémas pour les disponibilités et indisponibilités

---

### 9. `/dashboard/custom-form` - Formulaires personnalisés

**Fichier** : `dashboard/custom-form/+page.server.ts`

**Fonctionnalités** :
- Toggle pour accepter/refuser les demandes personnalisées
- Configuration du formulaire de demande personnalisée
- Gestion des champs du formulaire (label, type, options, prix, etc.)
- Vérification des permissions (plan Premium requis)

**Load function** :
- Charge la configuration du formulaire personnalisé
- Vérifie les permissions (plan Premium requis)
- Retourne `shopId` et `shopSlug`

**Actions** :
- `toggleCustomAccepted` : Activation/désactivation des demandes personnalisées
- `updateCustomForm` : Mise à jour de la configuration du formulaire

**Composants** :
- `+page.svelte` : Page principale
- `toggle-form.svelte` : Toggle pour activer/désactiver (utilise Switch)
- `update-form.svelte` : Formulaire de configuration

**Schémas** :
- `schema.ts` : Schémas pour la configuration

**Permissions** :
- Plan Premium requis pour gérer les formulaires personnalisés
- Les autres plans peuvent activer/désactiver mais pas configurer

---

### 10. `/dashboard/faq` - FAQ

**Fichier** : `dashboard/faq/+page.server.ts`

**Fonctionnalités** :
- Création, modification, suppression de questions/réponses
- Ordre des questions (géré par `order` field)
- Affichage de la liste des FAQ

**Load function** :
- Charge toutes les FAQ de la boutique
- Retourne `shopId` et `shopSlug`

**Actions** :
- `createFaq` : Création d'une FAQ
- `updateFaq` : Modification d'une FAQ
- `deleteFaq` : Suppression d'une FAQ

**Composants** :
- `+page.svelte` : Liste des FAQ avec actions
- `faq-form.svelte` : Formulaire pour créer/modifier une FAQ

**Schémas** :
- `schema.ts` : Schémas pour les FAQ

---

### 11. `/dashboard/settings` - Paramètres

**Fichier** : `dashboard/settings/+page.server.ts`

**Fonctionnalités** :
- Modification du profil
- Changement de mot de passe
- Création de mot de passe (si OAuth)
- Suppression du compte
- Gestion PayPal (affichage du compte associé)

**Load function** :
- Charge les informations du profil
- Vérifie si un mot de passe est défini
- Charge le compte PayPal associé
- Retourne les permissions

**Actions** :
- `updateProfile` : Mise à jour du profil
- `changePassword` : Changement de mot de passe
- `createPassword` : Création d'un mot de passe (pour les utilisateurs OAuth)
- `deleteAccount` : Suppression du compte (avec suppression de toutes les données associées)

**Composants** :
- `+page.svelte` : Page principale
- `change-password-form.svelte` : Formulaire pour changer le mot de passe
- `create-password-form.svelte` : Formulaire pour créer un mot de passe
- `delete-account-form.svelte` : Formulaire pour supprimer le compte

**Schémas** :
- `schema.ts` : Schémas pour toutes les actions

---

## Patterns et conventions

### 1. Load Functions

#### Pattern standard

```typescript
export const load: PageServerLoad = async ({ locals, parent }) => {
    // Réutiliser les données du parent
    const { permissions, shop, user } = await parent();
    
    // Vérifications de sécurité
    if (!permissions.shopId || !shop) {
        throw error(500, 'Erreur lors du chargement de la boutique');
    }
    
    // Charger les données spécifiques à la page
    const { data: specificData } = await locals.supabase
        .from('table')
        .select('*')
        .eq('shop_id', permissions.shopId);
    
    // Retourner shopId et shopSlug pour le frontend
    return {
        specificData,
        shopId: permissions.shopId,
        shopSlug: permissions.shopSlug || shop.slug
    };
};
```

### 2. Actions

#### Pattern standard

```typescript
export const actions: Actions = {
    myAction: async ({ request, locals }) => {
        // 1. Lire formData AVANT superValidate
        const formData = await request.formData();
        const shopId = formData.get('shopId') as string;
        const shopSlug = formData.get('shopSlug') as string;
        
        if (!shopId || !shopSlug) {
            return fail(400, { error: 'Données de boutique manquantes' });
        }
        
        // 2. Récupérer la session
        const { session } = await locals.safeGetSession();
        const userId = session?.user.id;
        
        if (!userId) {
            return fail(401, { error: 'Non autorisé' });
        }
        
        // 3. Vérifier la propriété
        const isOwner = await verifyShopOwnership(userId, shopId, locals.supabase);
        if (!isOwner) {
            return fail(403, { error: 'Accès non autorisé à cette boutique' });
        }
        
        // 4. Valider avec Superforms
        const form = await superValidate(formData, zod(mySchema));
        
        if (!form.valid) {
            return fail(400, { form });
        }
        
        // Logique métier...
        
        // 5. Retourner { form } pour Superforms
        form.message = 'Succès';
        return { form };
    }
};
```

### 3. Frontend - Formulaires

#### Pattern standard

```svelte
<script>
    import { page } from '$app/stores';
    import { superForm } from 'sveltekit-superforms/client';
</script>

<form method="POST" action="?/myAction" use:enhance>
    <!-- Passer shopId et shopSlug dans formData -->
    {#if $page.data.shopId}
        <input type="hidden" name="shopId" value={$page.data.shopId} />
    {/if}
    {#if $page.data.shopSlug}
        <input type="hidden" name="shopSlug" value={$page.data.shopSlug} />
    {/if}
    
    <!-- Autres champs du formulaire -->
</form>
```

### 4. UX Feedback

#### Pattern pour les boutons

```svelte
<Button
    type="submit"
    disabled={$submitting || submitted}
    class={`h-10 w-full text-sm font-medium text-white transition-all duration-200 disabled:cursor-not-allowed ${
        submitted
            ? 'bg-[#FF6F61] hover:bg-[#e85a4f] disabled:opacity-100'
            : $submitting
                ? 'bg-gray-600 hover:bg-gray-700 disabled:opacity-50'
                : 'bg-primary hover:bg-primary/90 disabled:opacity-50'
    }`}
>
    {#if $submitting}
        <LoaderCircle class="mr-2 h-5 w-5 animate-spin" />
        Chargement...
    {:else if submitted}
        <Check class="mr-2 h-5 w-5" />
        Succès !
    {:else}
        <Save class="mr-2 h-5 w-5" />
        Sauvegarder
    {/if}
</Button>
```

#### États des boutons

- **Normal** : `bg-primary`
- **Loading** : `bg-gray-600` + spinner
- **Success** : `bg-[#FF6F61]` (orange) + icône Check
- **Disabled** : `bg-gray-500` (quand champs requis non remplis)

### 5. Toggles (Switch)

#### Pattern pour les toggles

```svelte
<script>
    import { Switch } from '$lib/components/ui/switch';
    import { page } from '$app/stores';
    
    let localValue = $page.data.value;
</script>

<form method="POST" action="?/toggleAction" use:enhance>
    {#if $page.data.shopId}
        <input type="hidden" name="shopId" value={$page.data.shopId} />
    {/if}
    <input type="hidden" name="value" value={String(!localValue)} />
    
    <Switch
        checked={localValue}
        on:change={(e) => {
            localValue = e.detail;
            // Trigger submit
        }}
        disabled={$submitting}
    />
</form>
```

---

## Guide de développement

### Ajouter une nouvelle page

1. **Créer la structure** :
```
dashboard/my-page/
├── +page.server.ts
├── +page.svelte
└── schema.ts (si nécessaire)
```

2. **Implémenter le load function** :
```typescript
export const load: PageServerLoad = async ({ locals, parent }) => {
    const { permissions, shop, user } = await parent();
    
    if (!permissions.shopId || !shop) {
        throw error(500, 'Erreur lors du chargement');
    }
    
    // Charger les données spécifiques
    const { data } = await locals.supabase
        .from('table')
        .select('*')
        .eq('shop_id', permissions.shopId);
    
    return {
        data,
        shopId: permissions.shopId,
        shopSlug: permissions.shopSlug || shop.slug
    };
};
```

3. **Implémenter les actions** :
```typescript
export const actions: Actions = {
    myAction: async ({ request, locals }) => {
        const formData = await request.formData();
        const shopId = formData.get('shopId') as string;
        const shopSlug = formData.get('shopSlug') as string;
        
        if (!shopId || !shopSlug) {
            return fail(400, { error: 'Données manquantes' });
        }
        
        const { session } = await locals.safeGetSession();
        const userId = session?.user.id;
        
        if (!userId) {
            return fail(401, { error: 'Non autorisé' });
        }
        
        const isOwner = await verifyShopOwnership(userId, shopId, locals.supabase);
        if (!isOwner) {
            return fail(403, { error: 'Accès non autorisé' });
        }
        
        const form = await superValidate(formData, zod(mySchema));
        
        if (!form.valid) {
            return fail(400, { form });
        }
        
        // Logique métier...
        
        form.message = 'Succès';
        return { form };
    }
};
```

4. **Créer le formulaire frontend** :
```svelte
<script>
    import { page } from '$app/stores';
    import { superForm } from 'sveltekit-superforms/client';
</script>

<form method="POST" action="?/myAction" use:enhance>
    {#if $page.data.shopId}
        <input type="hidden" name="shopId" value={$page.data.shopId} />
    {/if}
    {#if $page.data.shopSlug}
        <input type="hidden" name="shopSlug" value={$page.data.shopSlug} />
    {/if}
    
    <!-- Champs du formulaire -->
</form>
```

### Utiliser un composant partagé

Les composants partagés sont dans `src/lib/components/` :

- `directory-form.svelte` : Formulaire de l'annuaire
- `product-form.svelte` : Formulaire de produit (création/édition)
- `category-form.svelte` : Formulaire de catégorie

### Déboguer

1. **Vérifier les données disponibles** :
   ```typescript
   console.log('Permissions:', permissions);
   console.log('Shop:', shop);
   console.log('User:', user);
   ```

2. **Vérifier les erreurs Superforms** :
   - S'assurer que tous les `fail()` retournent `{ form }`
   - Vérifier que le schéma Zod correspond aux données

3. **Vérifier les requêtes DB** :
   - Ouvrir les DevTools → Network
   - Filtrer par "rpc" ou "rest"
   - Vérifier les requêtes effectuées

---

## Conclusion

La section Dashboard est organisée de manière cohérente avec :
- ✅ **Structure claire** : Chaque page a son propre dossier
- ✅ **Patterns standardisés** : Load functions et actions suivent les mêmes patterns
- ✅ **Composants réutilisables** : Formulaires partagés pour éviter la duplication
- ✅ **UX cohérente** : Feedback visuel standardisé sur toutes les pages
- ✅ **Sécurité** : Vérification de propriété systématique avec `verifyShopOwnership()`

Toute nouvelle page ou modification doit suivre ces patterns pour maintenir la cohérence et la maintenabilité du code.