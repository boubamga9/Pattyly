# Analyse des Requêtes par Route - Section (pastry)

## Résumé
Cette analyse compte toutes les requêtes Supabase (SELECT, INSERT, UPDATE, DELETE, RPC) effectuées dans chaque route de la section `(pastry)`.

---

## Layouts (chargés à chaque navigation)

### `(pastry)/+layout.server.ts`
**Requêtes au chargement:**
- 1 RPC: `get_user_permissions`
- 1 SELECT: `shops` (récupération shop)
- 1 appel à `getUserPermissions()` = **4 requêtes** (1 RPC + 1 SELECT + 1 RPC + 1 RPC)
- 1 appel à `checkOrderLimit()` = **1 RPC** (`get_monthly_order_count`)

**Total: 6 requêtes**

---

### `(pastry)/dashboard/+layout.server.ts`
**Requêtes au chargement:**
- 1 appel à `getUserPermissions()` = **4 requêtes**

**Total: 4 requêtes**

---

## Pages

### `/dashboard` - `dashboard/+page.server.ts`
**Requêtes au chargement (load):**
- 1 SELECT: `shops`
- 1 RPC: `get_orders_metrics`
- 1 SELECT: `orders` (popular products)

**Total load: 3 requêtes**

**Requêtes dans les actions:**
- `createTransfer`:
  - 1 SELECT: `shops` (vérification)
  - 1 SELECT: `shop_transfers` (vérification doublon)
  - 1 INSERT: `shop_transfers`

**Total action createTransfer: 3 requêtes**

---

### `/dashboard/products` - `dashboard/products/+page.server.ts`
**Requêtes au chargement (load):**
- 1 RPC: `get_products_data` (optimisé - récupère tout en une fois)

**Total load: 1 requête**

**Requêtes dans les actions:**
- `deleteProduct`:
  - 1 SELECT: `products` (vérification)
  - 1 DELETE: `form_fields` (si form_id existe)
  - 1 DELETE: `forms` (si form_id existe)
  - 1 DELETE: `products`
  
  **Total: 4 requêtes**

- `duplicateProduct`:
  - 1 SELECT: `products` (récupération original)
  - 1 INSERT: `products` (création copie)
  - 1 SELECT: `forms` + `form_fields` (si form_id existe)
  - 1 INSERT: `forms` (si formulaire existe)
  - 1 INSERT: `form_fields` (si champs existent)
  - 1 UPDATE: `products` (association form_id)
  
  **Total: 6 requêtes**

- `createCategory`:
  - 1 SELECT: `categories` (vérification doublon)
  - 1 INSERT: `categories`
  
  **Total: 2 requêtes**

- `updateCategory`:
  - 1 SELECT: `categories` (vérification)
  - 1 SELECT: `categories` (vérification doublon)
  - 1 UPDATE: `categories`
  
  **Total: 3 requêtes**

- `deleteCategory`:
  - 1 SELECT: `categories` (vérification)
  - 1 SELECT: `products` (vérification produits associés)
  - 1 DELETE: `categories`
  
  **Total: 3 requêtes**

- `toggleProductActive`:
  - 1 SELECT: `products` (vérification)
  - 1 UPDATE: `products`
  
  **Total: 2 requêtes**

---

### `/dashboard/products/[id]` - `dashboard/products/[id]/+page.server.ts`
**Requêtes au chargement (load):**
- 1 SELECT: `products` + `categories` (jointure)
- 1 SELECT: `categories`
- 1 SELECT: `form_fields` (si form_id existe)

**Total load: 3 requêtes**

**Requêtes dans les actions:**
- `updateProduct`:
  - 1 SELECT: `categories` (création si nouvelle)
  - 1 INSERT: `categories` (si nouvelle)
  - 1 SELECT: `products` (récupération image_url)
  - 1 UPDATE: `products`
  - 1 SELECT: `products` (vérification form_id)
  - 1 SELECT: `form_fields` (récupération existants)
  - 1 DELETE: `form_fields` (suppression anciens)
  - 1 DELETE: `form_fields` (suppression supplémentaires)
  - 1 INSERT: `forms` (si nouveau formulaire)
  - 1 INSERT: `form_fields` (nouveaux champs)
  - 1 UPDATE: `products` (association form_id)
  - 1 INSERT: `categories` (si nouvelle catégorie)
  
  **Total: ~12 requêtes** (peut varier selon les conditions)

---

### `/dashboard/products/new` - `dashboard/products/new/+page.server.ts`
**Requêtes au chargement (load):**
- 1 SELECT: `categories`

**Total load: 1 requête**

**Requêtes dans les actions:**
- `createProduct`:
  - 1 INSERT: `categories` (si nouvelle catégorie)
  - 1 INSERT: `products`
  - 1 INSERT: `forms` (si formulaire)
  - 1 INSERT: `form_fields` (si champs)
  - 1 UPDATE: `products` (association form_id)
  
  **Total: 5 requêtes**

- `createCategory`:
  - 1 SELECT: `categories` (vérification)
  - 1 INSERT: `categories`
  
  **Total: 2 requêtes**

---

### `/dashboard/orders` - `dashboard/orders/+page.server.ts`
**Requêtes au chargement (load):**
- 1 RPC: `get_orders_data` (optimisé - récupère tout en une fois)

**Total load: 1 requête**

---

### `/dashboard/orders/[id]` - `dashboard/orders/[id]/+page.server.ts`
**Requêtes au chargement (load):**
- 1 RPC: `get_order_detail_data` (optimisé - récupère tout en une fois)

**Total load: 1 requête**

**Requêtes dans les actions:**
- `savePersonalNote`:
  - 1 SELECT: `shops` (vérification)
  - 1 SELECT: `personal_order_notes` (vérification existence)
  - 1 INSERT/UPDATE: `personal_order_notes`
  
  **Total: 3 requêtes**

- `makeQuote`:
  - 1 SELECT: `shops`
  - 1 RPC: `generate_order_ref`
  - 1 UPDATE: `orders`
  
  **Total: 3 requêtes**

- `confirmOrder`:
  - 1 SELECT: `shops`
  - 1 UPDATE: `orders`
  
  **Total: 2 requêtes**

- `markReady`:
  - 1 SELECT: `shops`
  - 1 UPDATE: `orders`
  
  **Total: 2 requêtes**

- `markCompleted`:
  - 1 SELECT: `shops`
  - 1 UPDATE: `orders`
  
  **Total: 2 requêtes**

- `refuseOrder`:
  - 1 SELECT: `shops`
  - 1 SELECT: `orders`
  - 1 UPDATE: `orders`
  
  **Total: 3 requêtes**

- `deletePersonalNote`:
  - 1 SELECT: `shops`
  - 1 DELETE: `personal_order_notes`
  
  **Total: 2 requêtes**

---

### `/dashboard/availability` - `dashboard/availability/+page.server.ts`
**Requêtes au chargement (load):**
- 1 RPC: `get_availability_data` (optimisé - récupère tout en une fois)

**Total load: 1 requête**

**Requêtes dans les actions:**
- `updateAvailability`:
  - 1 SELECT: `availabilities` (vérification)
  - 1 UPDATE: `availabilities`
  
  **Total: 2 requêtes**

- `addUnavailability`:
  - 1 SELECT: `unavailabilities` (vérification chevauchements)
  - 1 INSERT: `unavailabilities`
  
  **Total: 2 requêtes**

- `deleteUnavailability`:
  - 1 SELECT: `unavailabilities` (vérification)
  - 1 DELETE: `unavailabilities`
  
  **Total: 2 requêtes**

---

### `/dashboard/faq` - `dashboard/faq/+page.server.ts`
**Requêtes au chargement (load):**
- 1 RPC: `get_faq_data` (optimisé - récupère tout en une fois)

**Total load: 1 requête**

**Requêtes dans les actions:**
- `create`:
  - 1 INSERT: `faq`
  
  **Total: 1 requête**

- `update`:
  - 1 UPDATE: `faq`
  
  **Total: 1 requête**

- `delete`:
  - 1 DELETE: `faq`
  
  **Total: 1 requête**

---

### `/dashboard/shop` - `dashboard/shop/+page.server.ts`
**Requêtes au chargement (load):**
- 1 SELECT: `shops`
- 1 SELECT: `shop_customizations`

**Total load: 2 requêtes**

**Requêtes dans les actions:**
- `updateShop`:
  - 1 SELECT: `shops` (vérification logo/slug)
  - 1 SELECT: `shops` (vérification slug unique)
  - 1 UPDATE: `shops`
  
  **Total: 3 requêtes**

- `updateCustomizations`:
  - 1 SELECT: `shops` (vérification slug)
  - 1 SELECT: `shop_customizations` (vérification background_image)
  - 1 UPDATE: `shop_customizations`
  
  **Total: 3 requêtes**

- `updateDirectory`:
  - 1 SELECT: `shops` (vérification slug)
  - 1 UPDATE: `shops`
  
  **Total: 2 requêtes**

---

### `/dashboard/custom-form` - `dashboard/custom-form/+page.server.ts`
**Requêtes au chargement (load):**
- 1 SELECT: `shops`
- 1 SELECT: `forms` (custom form)
- 1 SELECT: `form_fields` (si form existe)

**Total load: 3 requêtes**

**Requêtes dans les actions:**
- `toggleCustomRequests`:
  - 1 UPDATE: `shops`
  
  **Total: 1 requête**

- `updateCustomForm`:
  - 1 SELECT: `forms` (vérification existence)
  - 1 INSERT: `forms` (si nouveau)
  - 1 UPDATE: `forms` (si existe)
  - 1 DELETE: `form_fields` (anciens)
  - 1 INSERT: `form_fields` (nouveaux)
  
  **Total: 5 requêtes**

---

### `/dashboard/settings` - `dashboard/settings/+page.server.ts`
**Requêtes au chargement (load):**
- 1 RPC: `user_password_set`
- 1 SELECT: `paypal_accounts`

**Total load: 2 requêtes**

**Requêtes dans les actions:**
- `updateProfile`: Aucune requête DB (juste validation)
- `changePassword`: Aucune requête DB directe (géré par Supabase Auth)
- `createPassword`: Aucune requête DB directe (géré par Supabase Auth)
- `deleteAccount`:
  - 1 SELECT: `stripe_customers`
  - 1 DELETE: `profiles` (via service role)
  - 1 RPC: `user_password_set` (vérification)
  - 1 SELECT: `stripe_customers` (vérification)
  - 1 SELECT: `stripe_customers` (récupération)
  - 1 SELECT: `paypal_accounts` (vérification)
  - 1 SELECT: `paypal_accounts` (récupération)
  
  **Total: ~7 requêtes**

---

## Statistiques Globales

### Routes les plus optimisées (1 requête au load):
- ✅ `/dashboard/products` - Utilise RPC `get_products_data`
- ✅ `/dashboard/orders` - Utilise RPC `get_orders_data`
- ✅ `/dashboard/orders/[id]` - Utilise RPC `get_order_detail_data`
- ✅ `/dashboard/availability` - Utilise RPC `get_availability_data`
- ✅ `/dashboard/faq` - Utilise RPC `get_faq_data`

### Routes avec le plus de requêtes:
- ⚠️ `/dashboard/products/[id]` (action updateProduct): ~12 requêtes
- ⚠️ `/dashboard/settings` (action deleteAccount): ~7 requêtes
- ⚠️ `/dashboard/products` (action duplicateProduct): 6 requêtes

### Notes importantes:
- Les layouts ajoutent **6-10 requêtes** à chaque navigation (selon le layout)
- `getUserPermissions()` fait **4 requêtes** à chaque appel
- Plusieurs routes utilisent des RPC optimisés qui réduisent le nombre de requêtes

