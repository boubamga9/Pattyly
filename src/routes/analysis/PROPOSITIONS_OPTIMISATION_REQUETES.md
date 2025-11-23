# 🚀 Propositions d'Optimisation des Requêtes - Section (pastry)

## 📊 Analyse des Problèmes Actuels

### Problème #1 : `getUserPermissions()` fait 4 requêtes et est appelé partout
- Appelé dans presque toutes les routes
- Fait 4 requêtes à chaque appel :
  1. RPC `get_user_permissions`
  2. SELECT `shops` (via `getShopIdAndSlug`)
  3. RPC `get_user_plan`
  4. RPC `get_product_count`

### Problème #2 : Layout principal fait des requêtes redondantes
- Appelle `get_user_permissions` RPC
- Puis appelle `getUserPermissions()` qui refait `get_user_permissions` + autres requêtes
- Récupère `shop` séparément alors que `getUserPermissions` le fait aussi

### Problème #3 : Actions avec beaucoup de vérifications séquentielles
- `/dashboard/products/[id]` (updateProduct) : ~12 requêtes
- Beaucoup de SELECT de vérification avant UPDATE/INSERT/DELETE

---

## ✅ Propositions d'Optimisation

### 🎯 **Optimisation #1 : Créer un RPC `get_user_permissions_complete`**

**Impact : Réduire de 4 requêtes à 1 requête pour `getUserPermissions()`**

Créer une fonction PostgreSQL qui regroupe toutes les permissions en une seule requête :

```sql
CREATE OR REPLACE FUNCTION get_user_permissions_complete(
    p_profile_id UUID,
    p_premium_product_id TEXT DEFAULT NULL,
    p_basic_product_id TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'shop_id', s.id,
        'shop_slug', s.slug,
        'plan', get_user_plan(p_profile_id, p_premium_product_id, p_basic_product_id),
        'product_count', get_product_count(p_profile_id),
        'has_shop', s.id IS NOT NULL,
        'has_payment_method', EXISTS(SELECT 1 FROM payment_links WHERE profile_id = p_profile_id),
        'has_ever_had_subscription', EXISTS(
            SELECT 1 FROM user_products 
            WHERE profile_id = p_profile_id 
            AND subscription_status = 'active'
        ),
        'is_exempt', EXISTS(
            SELECT 1 FROM profiles 
            WHERE id = p_profile_id 
            AND is_stripe_free = true
        )
    ) INTO result
    FROM shops s
    WHERE s.profile_id = p_profile_id
    LIMIT 1;
    
    RETURN COALESCE(result, json_build_object(
        'shop_id', NULL,
        'shop_slug', NULL,
        'plan', 'free',
        'product_count', 0,
        'has_shop', false,
        'has_payment_method', false,
        'has_ever_had_subscription', false,
        'is_exempt', false
    ));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Bénéfice :**
- `getUserPermissions()` passe de **4 requêtes à 1 requête**
- Réduction de **75% des requêtes** pour cette fonction
- Appelée dans ~15 routes → économie de **~45 requêtes par navigation**

---

### 🎯 **Optimisation #2 : Optimiser le Layout Principal**

**Impact : Réduire de 6 requêtes à 2-3 requêtes**

**Problème actuel :**
```typescript
// 1. RPC get_user_permissions
const { data: userPermissions } = await supabase.rpc('get_user_permissions', {...});

// 2. SELECT shops (redondant)
const { data: shop } = await supabase.from('shops').select('*')...;

// 3. getUserPermissions() qui refait get_user_permissions + 3 autres requêtes
const permissions = await getUserPermissions(user.id, supabase);

// 4. checkOrderLimit (1 RPC)
const orderLimitStats = await checkOrderLimit(...);
```

**Solution :**
```typescript
// Utiliser le nouveau RPC optimisé
const { data: permissionsData } = await supabase.rpc('get_user_permissions_complete', {
    p_profile_id: user.id,
    p_premium_product_id: STRIPE_PRODUCTS.PREMIUM,
    p_basic_product_id: STRIPE_PRODUCTS.BASIC
});

// Récupérer shop en même temps (ou l'inclure dans le RPC)
const { data: shop } = await supabase
    .from('shops')
    .select('*')
    .eq('profile_id', user.id)
    .single();

// checkOrderLimit (1 RPC)
const orderLimitStats = await checkOrderLimit(permissionsData.shop_id, user.id, supabase);
```

**Bénéfice :**
- Layout passe de **6 requêtes à 3 requêtes** (50% de réduction)
- Économie de **3 requêtes à chaque navigation**

---

### 🎯 **Optimisation #3 : Créer un RPC pour les vérifications de sécurité**

**Impact : Réduire les vérifications multiples dans les actions**

**Problème actuel :**
Dans beaucoup d'actions, on fait :
```typescript
// 1. Vérifier que le produit appartient au shop
const { data: product } = await supabase
    .from('products')
    .select('id, name, form_id')
    .eq('id', productId)
    .eq('shop_id', shopId)
    .single();

// 2. Vérifier que le shop appartient à l'utilisateur
const { data: shop } = await supabase
    .from('shops')
    .select('id')
    .eq('id', shopId)
    .eq('profile_id', userId)
    .single();
```

**Solution : Créer un RPC de vérification**
```sql
CREATE OR REPLACE FUNCTION verify_shop_ownership(
    p_profile_id UUID,
    p_shop_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS(
        SELECT 1 FROM shops 
        WHERE id = p_shop_id 
        AND profile_id = p_profile_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Bénéfice :**
- Réduit les vérifications de 2 requêtes à 1 RPC
- Plus rapide et plus sécurisé

---

### 🎯 **Optimisation #4 : Regrouper les vérifications dans les actions complexes**

**Impact : Réduire `/dashboard/products/[id]` de 12 à ~6 requêtes**

**Problème actuel dans `updateProduct` :**
- 1 SELECT categories (vérification)
- 1 INSERT categories (si nouvelle)
- 1 SELECT products (récupération image)
- 1 UPDATE products
- 1 SELECT products (vérification form_id)
- 1 SELECT form_fields (récupération existants)
- 1 DELETE form_fields
- 1 DELETE form_fields (supplémentaire)
- 1 INSERT forms
- 1 INSERT form_fields
- 1 UPDATE products
- 1 INSERT categories (si nouvelle)

**Solution : Utiliser des transactions et regrouper**
```typescript
// Au lieu de vérifier puis insérer, utiliser INSERT ... ON CONFLICT
const { data: category } = await supabase
    .from('categories')
    .insert({ name: categoryName, shop_id: shopId })
    .select()
    .single()
    .onConflict('name,shop_id')
    .merge(); // Si existe déjà, on récupère l'existant

// Regrouper les DELETE de form_fields en une seule requête
const { error } = await supabase
    .from('form_fields')
    .delete()
    .eq('form_id', formId)
    .in('id', oldFieldIds); // Supprimer seulement ceux qui ne sont plus nécessaires
```

**Bénéfice :**
- Réduction de **~50% des requêtes** dans les actions complexes
- Meilleure performance grâce aux transactions

---

### 🎯 **Optimisation #5 : Mettre en cache les permissions dans le layout**

**Impact : Éviter de recalculer les permissions à chaque navigation**

**Solution : Utiliser SvelteKit's `parent()` pour réutiliser les données du layout**

**Problème actuel :**
```typescript
// Dans chaque page
const permissions = await getUserPermissions(user.id, supabase); // 4 requêtes
```

**Solution :**
```typescript
// Dans chaque page
const { permissions } = await parent(); // 0 requête, réutilise du layout
```

**Bénéfice :**
- Économie de **4 requêtes par page** qui utilise `parent()`
- Plus rapide et moins de charge sur la DB

---

### 🎯 **Optimisation #6 : Inclure shop dans le RPC permissions**

**Impact : Éviter de récupérer shop séparément**

Modifier `get_user_permissions_complete` pour inclure les données du shop :

```sql
SELECT json_build_object(
    'shop_id', s.id,
    'shop_slug', s.slug,
    'shop', json_build_object(
        'id', s.id,
        'name', s.name,
        'slug', s.slug,
        'bio', s.bio,
        'logo_url', s.logo_url,
        'is_active', s.is_active,
        -- ... autres champs nécessaires
    ),
    'plan', ...,
    -- ... reste
) INTO result
FROM shops s
WHERE s.profile_id = p_profile_id;
```

**Bénéfice :**
- Évite 1 SELECT supplémentaire dans le layout
- Données cohérentes (shop + permissions en une fois)

---

## 📈 Résumé des Gains Potentiels

### Avant Optimisation (par navigation typique)
- Layout : 6 requêtes
- Page : 1-4 requêtes
- `getUserPermissions()` : 4 requêtes (appelé dans chaque page)
- **Total : ~11-15 requêtes par navigation**

### Après Optimisation
- Layout : 2-3 requêtes (avec RPC optimisé)
- Page : 1 requête (réutilise `parent()`)
- `getUserPermissions()` : 1 requête (RPC optimisé)
- **Total : ~4-5 requêtes par navigation**

### 🎉 Gain Global : **~60-70% de réduction des requêtes**

---

## 🛠️ Plan d'Implémentation Recommandé

### Phase 1 : Quick Wins (1-2 jours)
1. ✅ Créer le RPC `get_user_permissions_complete`
2. ✅ Modifier `getUserPermissions()` pour utiliser le nouveau RPC
3. ✅ Utiliser `parent()` dans les pages au lieu de rappeler `getUserPermissions()`

**Gain immédiat : ~50% de réduction**

### Phase 2 : Optimisations Moyennes (2-3 jours)
4. ✅ Optimiser le layout principal
5. ✅ Créer RPC de vérification de sécurité
6. ✅ Inclure shop dans le RPC permissions

**Gain supplémentaire : ~20% de réduction**

### Phase 3 : Optimisations Avancées (3-5 jours)
7. ✅ Regrouper les vérifications dans les actions complexes
8. ✅ Utiliser `ON CONFLICT` pour les INSERT
9. ✅ Optimiser les DELETE multiples

**Gain supplémentaire : ~10% de réduction**

---

## ⚠️ Points d'Attention

1. **Sécurité** : Les RPC doivent utiliser `SECURITY DEFINER` avec précaution
2. **Cache** : Vérifier que les données ne sont pas trop mises en cache (permissions peuvent changer)
3. **Tests** : Tester chaque optimisation pour s'assurer que les permissions fonctionnent toujours
4. **Migration** : Faire les changements progressivement pour éviter les régressions

---

## 📝 Fichiers à Modifier

### À créer :
- `supabase/migrations/112_create_get_user_permissions_complete.sql`
- `supabase/migrations/113_create_verify_shop_ownership.sql`

### À modifier :
- `src/lib/auth/permissions.ts` (utiliser le nouveau RPC)
- `src/routes/(pastry)/+layout.server.ts` (optimiser)
- `src/routes/(pastry)/dashboard/+page.server.ts` (utiliser parent())
- Toutes les pages qui appellent `getUserPermissions()` directement

---

## 🎯 Priorité d'Implémentation

1. **🔴 Haute Priorité** : Optimisation #1 (RPC complet) - Impact maximum
2. **🟡 Moyenne Priorité** : Optimisation #5 (parent()) - Facile et efficace
3. **🟡 Moyenne Priorité** : Optimisation #2 (Layout) - Réduit les requêtes globales
4. **🟢 Basse Priorité** : Optimisations #3, #4, #6 - Améliorations ciblées

