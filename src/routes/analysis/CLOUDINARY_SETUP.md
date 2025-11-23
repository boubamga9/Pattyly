# Configuration Cloudinary

Ce projet utilise Cloudinary pour la gestion et l'optimisation automatique des images.

## Variables d'environnement requises

Ajoutez ces variables à votre fichier `.env` :

```env
CLOUDINARY_CLOUD_NAME=votre_cloud_name
CLOUDINARY_API_KEY=votre_api_key
CLOUDINARY_API_SECRET=votre_api_secret
```

## Comment obtenir vos credentials Cloudinary

1. Créez un compte gratuit sur [cloudinary.com](https://cloudinary.com)
2. Une fois connecté, allez dans le **Dashboard**
3. Vous trouverez vos credentials dans la section **Account Details** :
   - **Cloud name** : votre nom de cloud
   - **API Key** : votre clé API
   - **API Secret** : votre secret API (à garder confidentiel)

## Plan gratuit Cloudinary

Le plan gratuit offre :
- **25 GB** de stockage
- **25 GB** de bande passante/mois
- **25,000 transformations**/mois

Cela permet de supporter environ :
- **~20,000 pâtissiers actifs**
- **~25,000 visites de boutiques/mois**
- **~2,500 commandes/mois**

## Fonctionnalités

### Upload automatique
- Compression automatique lors de l'upload
- Optimisation du format (WebP/AVIF selon le navigateur)
- Redimensionnement intelligent

### Transformations à la volée
Vous pouvez générer différentes variantes d'une image via URL :

```typescript
import { getCloudinaryUrl } from '$lib/cloudinary';

// Image complète (800x800)
const fullImage = getCloudinaryUrl('public-id', [
  { width: 800, height: 800, crop: 'limit' }
]);

// Miniature (150x150)
const thumbnail = getCloudinaryUrl('public-id', [
  { width: 150, height: 150, crop: 'fill' }
]);
```

### Presets disponibles

- `PRODUCT` : Images produits (800x800 max)
- `LOGO` : Logos boutiques (400x400 max)
- `BACKGROUND` : Images de fond (1920x1080 max)
- `THUMBNAIL` : Miniatures (150x150)
- `INSPIRATION` : Images d'inspiration (qualité auto)

## Migration depuis Supabase Storage

Le code supporte automatiquement les deux systèmes :
- Les nouvelles images sont uploadées vers Cloudinary
- Les anciennes images Supabase continuent de fonctionner
- La suppression détecte automatiquement le type d'URL

## Support

Pour toute question sur Cloudinary :
- Documentation : [cloudinary.com/documentation](https://cloudinary.com/documentation)
- Support : support@cloudinary.com

