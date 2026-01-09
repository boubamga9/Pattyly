# 📧 Guide des Campagnes Email Marketing

Ce dossier contient tous les éléments nécessaires pour créer et envoyer des campagnes email marketing sur Pattyly.

## 📁 Structure

- **`templates/`** : Templates HTML réutilisables pour les emails
- **`campaigns/`** : Fichiers de configuration JSON pour chaque campagne
- **`segments/`** : Requêtes SQL pour segmenter les utilisateurs

## 🚀 Utilisation rapide

### Envoyer une campagne simple

```bash
npm run send:campaign "email@example.com" "Sujet" "Contenu HTML" "Bouton" "https://pattyly.com"
```

### Envoyer avec un fichier de configuration

```bash
npm run send:campaign -- --file email-campaigns/campaigns/ma-campagne.json
```

## 📝 Créer une nouvelle campagne

1. **Créer un template HTML** (optionnel) dans `templates/`
   - Utilise le HTML complet
   - Le design sera automatiquement intégré dans le style Pattyly

2. **Créer un fichier JSON** dans `campaigns/`
   - Référence le template avec `contentFile`
   - Ou utilise `content` pour du HTML direct

3. **Exécuter la commande** :
   ```bash
   npm run send:campaign -- --file email-campaigns/campaigns/ma-campagne.json
   ```

## 📊 Segmenter les utilisateurs

Utilise les requêtes SQL dans `segments/` pour récupérer des listes d'emails selon différents critères :

1. Exécuter la requête SQL sur Supabase
2. Exporter les résultats (colonne email)
3. Créer un fichier JSON avec la liste d'emails
4. Envoyer la campagne

## ⚙️ Options disponibles dans les fichiers JSON

- **`emails`** (requis) : Liste des emails destinataires
- **`subject`** (requis) : Sujet de l'email
- **`content`** (optionnel) : Contenu HTML direct
- **`contentFile`** (optionnel) : Chemin vers un fichier HTML (prioritaire sur content)
- **`ctaText`** (optionnel) : Texte du bouton d'action
- **`ctaUrl`** (optionnel) : URL du bouton d'action
- **`personalizeFromDb`** (optionnel, défaut: false) : Récupère le nom depuis la DB
- **`delayBetweenEmails`** (optionnel, défaut: 200) : Délai en ms entre chaque email
- **`retryOnError`** (optionnel, défaut: true) : Active le retry automatique
- **`maxRetries`** (optionnel, défaut: 3) : Nombre maximum de tentatives

## 📧 Informations techniques

- **Adresse d'envoi** : L'équipe Pattyly <hello@pattyly.com>
- **Service** : Resend
- **Désabonnement** : Géré automatiquement via `/unsubscribe`
- **Headers** : `List-Unsubscribe` configurés pour Gmail/Outlook

## 🔒 Sécurité

- Les fichiers dans `campaigns/` sont ignorés par git (données sensibles)
- Seuls les templates et exemples sont versionnés
- Toujours vérifier les listes d'emails avant d'envoyer

## 📚 Exemples

Voir `campaigns/example.json` pour un exemple de configuration complète.

