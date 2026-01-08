# 🔍 Rapport d'audit des fonctions Supabase obsolètes

## 📊 Résumé exécutif

Audit complet des fonctions Supabase pour identifier les versions obsolètes qui doivent être supprimées.

**Résultat** : **1 fonction obsolète trouvée** qui n'a pas été nettoyée.

---

## ✅ Fonctions déjà nettoyées (supprimées correctement)

Ces fonctions avaient des versions obsolètes qui ont été supprimées via des migrations dédiées :

### 1. `check_order_limit`
- ❌ **Ancienne version** (2 paramètres) : `20240101000000_initial_schema_from_prod.sql`
  - Signature : `(p_shop_id uuid, p_profile_id uuid)`
- ✅ **Nouvelle version** (5 paramètres) : `20250131000000_update_check_order_limit_for_lifetime.sql`
  - Signature : `(p_shop_id uuid, p_profile_id uuid, p_premium_product_id text, p_basic_product_id text, p_lifetime_product_id text)`
- ✅ **Nettoyage** : Migration `20250201000002_fix_check_order_limit_overload.sql` supprime l'ancienne version

### 2. `get_user_plan`
- ❌ **Ancienne version** (3 paramètres) : `20240101000000_initial_schema_from_prod.sql`
  - Signature : `(p_profile_id uuid, premium_product_id text, basic_product_id text)`
- ✅ **Nouvelle version** (4 paramètres) : `20250101000000_add_lifetime_plan_support.sql`
  - Signature : `(p_profile_id uuid, premium_product_id text, basic_product_id text, lifetime_product_id text)`
- ✅ **Nettoyage** : Migration `20250201000003_fix_get_user_plan_overload.sql` supprime l'ancienne version

### 3. `get_user_permissions_complete`
- ❌ **Ancienne version** (3 paramètres) : `20240101000000_initial_schema_from_prod.sql`
  - Signature : `(p_profile_id uuid, p_premium_product_id text, p_basic_product_id text)`
- ✅ **Nouvelle version** (4 paramètres) : `20250207000000_fix_exempt_support_in_functions.sql`
  - Signature : `(p_profile_id uuid, p_premium_product_id text, p_basic_product_id text, p_lifetime_product_id text)`
- ✅ **Nettoyage** : Migration `20250201000001_fix_get_user_permissions_complete_overload.sql` supprime l'ancienne version

### 4. `check_premium_profiles`
- ❌ **Ancienne version** (2 paramètres) : `20240101000000_initial_schema_from_prod.sql`
  - Signature : `(p_profile_ids uuid[], p_premium_product_id text)`
- ✅ **Nouvelle version** (3 paramètres) : `20250204000000_add_lifetime_support_to_directory_functions.sql`
  - Signature : `(p_profile_ids uuid[], p_premium_product_id text, p_lifetime_product_id text)`
- ✅ **Nettoyage** : Migration `20250207000000_fix_exempt_support_in_functions.sql` supprime l'ancienne version

---

## 🚨 Fonction obsolète à nettoyer

### `check_product_limit`

#### ❌ Ancienne version (OBSOLÈTE - À SUPPRIMER)
- **Définie dans** : `20240101000000_initial_schema_from_prod.sql` (ligne 288)
- **Signature** : `(p_shop_id uuid, p_profile_id uuid)`
- **Problèmes** :
  - IDs Stripe codés en dur (`'prod_Selcz36pAfV3vV'`, `'prod_Selbd3Ne2plHqG'`)
  - Ne compte pas uniquement les produits actifs
  - Ne supporte pas les plans `lifetime` et `exempt`
  - Pas flexible pour différents environnements (dev/prod)

#### ✅ Nouvelle version (ACTUELLE)
- **Définie dans** : `20250207000000_fix_exempt_support_in_functions.sql` (ligne 5)
- **Signature** : `(p_shop_id uuid, p_profile_id uuid, p_premium_product_id text, p_basic_product_id text, p_lifetime_product_id text)`
- **Avantages** :
  - IDs Stripe passés en paramètres (flexible pour dev/prod)
  - Supporte les plans `lifetime` et `exempt`
  - Ne compte que les produits actifs (`is_active = true`)
  - Utilisée par le code TypeScript (`src/lib/utils/product-limits.ts`)

#### ❌ Problème
**Aucune migration n'a supprimé l'ancienne version à 2 paramètres !**

L'ancienne version coexiste encore avec la nouvelle dans la base de données, ce qui peut créer :
- Confusion pour les développeurs
- Ambiguïté pour PostgREST (surcharge de fonction)
- Risque d'utilisation accidentelle de l'ancienne version

---

## 📋 Plan d'action recommandé

### Migration à créer

Créer une nouvelle migration `20250209000000_fix_check_product_limit_overload.sql` pour supprimer l'ancienne version :

```sql
-- Fix: Supprimer l'ancienne version de check_product_limit (2 paramètres)
-- pour résoudre le conflit de surcharge avec la nouvelle version (5 paramètres)
-- 
-- Problème: L'ancienne version (2 paramètres) coexiste avec la nouvelle (5 paramètres)
-- et peut créer des ambiguïtés pour PostgREST.
-- Solution: Supprimer explicitement l'ancienne version.

DROP FUNCTION IF EXISTS "public"."check_product_limit"(
    "p_shop_id" "uuid", 
    "p_profile_id" "uuid"
);

-- La version avec 5 paramètres (incluant p_premium_product_id, p_basic_product_id, p_lifetime_product_id) 
-- reste active et est déjà définie dans la migration 20250207000000_fix_exempt_support_in_functions.sql
```

---

## 📈 Statistiques

- **Fonctions auditées** : 5 fonctions principales qui ont évolué
- **Fonctions nettoyées** : 4 ✅
- **Fonctions à nettoyer** : 1 ❌
- **Taux de nettoyage** : 80%

---

## 🔍 Méthodologie

1. Analyse de toutes les migrations SQL
2. Identification des fonctions avec plusieurs versions (surcharges)
3. Vérification des migrations de nettoyage (`DROP FUNCTION`)
4. Comparaison avec le code TypeScript pour confirmer les versions utilisées
5. Vérification dans la base Supabase (requête SQL)

---

## 📝 Notes

- Les fonctions avec surcharges (plusieurs signatures) peuvent créer des ambiguïtés pour PostgREST
- Il est recommandé de toujours supprimer les anciennes versions après migration
- Les migrations de nettoyage suivent le pattern `fix_<function_name>_overload.sql`
- Toutes les nouvelles versions acceptent les IDs Stripe en paramètres pour la flexibilité dev/prod

---

*Rapport généré le : 2025-01-09*

