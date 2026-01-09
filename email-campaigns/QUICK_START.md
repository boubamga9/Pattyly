# 🚀 Guide Rapide - Campagnes Email

## Envoyer une campagne en 3 étapes

### Étape 1 : Récupérer les emails

Exécute une requête SQL depuis `segments/` sur Supabase pour obtenir une liste d'emails.

### Étape 2 : Créer le fichier de campagne

Crée un fichier JSON dans `campaigns/` (ex: `ma-campagne.json`) :

```json
{
  "emails": [
    "email1@example.com",
    "email2@example.com"
  ],
  "subject": "Mon sujet",
  "contentFile": "../templates/onboarding-incomplete.html",
  "ctaText": "Mon bouton",
  "ctaUrl": "https://pattyly.com"
}
```

### Étape 3 : Envoyer

```bash
npm run send:campaign -- --file email-campaigns/campaigns/ma-campagne.json
```

## Templates disponibles

- `affiliation.html` - Annonce du programme d'affiliation
- `onboarding-incomplete.html` - Aide pour finaliser l'inscription
- `campaign-template.html` - Template générique

## Exemples de campagnes

- `affiliation-example.json` - Exemple pour l'affiliation
- `onboarding-incomplete-example.json` - Exemple pour onboarding
- `example.json` - Template générique

## ⚠️ Important

- Les fichiers JSON dans `campaigns/` sont **ignorés par git** (sauf les exemples)
- Vérifie toujours la liste d'emails avant d'envoyer
- Le script demande confirmation avant l'envoi

