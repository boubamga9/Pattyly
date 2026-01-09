# 📊 Segmentation des Utilisateurs

Ce dossier contient des requêtes SQL pour récupérer des listes d'emails selon différents critères.

## Utilisation

1. **Exécuter la requête SQL** sur Supabase (via le dashboard ou psql)
2. **Exporter les résultats** - copier la colonne `email` 
3. **Créer un fichier JSON** dans `../campaigns/` avec la liste d'emails
4. **Envoyer la campagne** avec `npm run send:campaign -- --file email-campaigns/campaigns/ma-campagne.json`

## Requêtes disponibles

### `users-without-shop.sql`
Utilisateurs qui ont créé un compte mais n'ont pas encore créé de boutique.

### `users-without-payment.sql`
Utilisateurs qui ont une boutique mais n'ont pas configuré de moyen de paiement (Stripe Connect).

### `users-inactive.sql`
Utilisateurs qui n'ont pas été actifs récemment (à créer selon tes besoins).

## Exemple d'utilisation

```sql
-- 1. Exécuter la requête
-- 2. Copier les emails (colonne email)
-- 3. Créer campaigns/mes-utilisateurs.json :
{
  "emails": [
    "email1@example.com",
    "email2@example.com",
    ...
  ],
  "subject": "Sujet",
  "contentFile": "../templates/onboarding-incomplete.html",
  "ctaText": "Finaliser",
  "ctaUrl": "https://pattyly.com/onboarding"
}
```

## ⚠️ Important

- Vérifie toujours les listes avant d'envoyer
- Les fichiers JSON dans `campaigns/` sont ignorés par git
- Ne partage jamais les listes d'emails

