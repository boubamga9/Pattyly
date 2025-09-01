# 🚀 Guide de Mise en Production - Pattyly

## 📋 **Vue d'ensemble**

Ce document détaille toutes les étapes nécessaires pour passer Pattyly de l'environnement de développement à la production, en optimisant les performances et la sécurité.

---

## 🔒 **1. Sécurité et Authentification**

### **Variables d'environnement critiques**
```bash
# À configurer absolument
PRIVATE_STRIPE_SECRET_KEY=sk_live_...
PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Email (Resend)
PRIVATE_SMTP_PASSWORD=your-resend-api-key
PUBLIC_SITE_URL=https://yourdomain.com

# Sécurité
SESSION_SECRET=your-super-secret-session-key
```

### **Vérifications de sécurité**
- [ ] RLS (Row Level Security) activé sur toutes les tables
- [ ] Politiques RLS testées et validées
- [ ] Pas de clés API exposées dans le code client
- [ ] Validation serveur stricte sur tous les formulaires
- [ ] Rate limiting configuré (voir section suivante)

---

## 🚦 **2. Rate Limiting avec Redis**

### **Migration depuis le système actuel**

**État actuel** : Système de rate limiting en mémoire dans `src/hooks.server.ts` pour les formulaires publics :
- Contact : 3 tentatives/heure
- Register : 5 tentatives/heure  
- Login : 10 tentatives/heure
- Forgot-password : 3 tentatives/heure
- Custom/Product : 5 tentatives/heure

### **Installation et configuration**
```bash
# Installer Redis
npm install redis @types/redis

# Variables d'environnement
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your-redis-password
```

### **Migration du code existant**

#### **Étape 1 : Créer la classe Redis Rate Limiter**
```typescript
// src/lib/utils/redis-rate-limiter.ts
import { createClient } from 'redis';

export class RedisRateLimiter {
  private redis: ReturnType<typeof createClient>;
  
  constructor() {
    this.redis = createClient({
      url: process.env.REDIS_URL,
      password: process.env.REDIS_PASSWORD
    });
  }

  async checkLimit(key: string, limit: number, window: number): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
    retryAfter?: number;
  }> {
    const now = Date.now();
    const resetTime = now + window;
    
    // Utiliser MULTI pour une opération atomique
    const multi = this.redis.multi();
    multi.incr(key);
    multi.expire(key, Math.ceil(window / 1000));
    
    const results = await multi.exec();
    const currentCount = results[0] as number;
    
    const remaining = Math.max(0, limit - currentCount);
    const allowed = currentCount <= limit;
    
    return {
      allowed,
      remaining,
      resetTime,
      retryAfter: allowed ? undefined : Math.ceil((resetTime - now) / 1000)
    };
  }

  async getRemaining(key: string): Promise<number> {
    const count = await this.redis.get(key);
    return count ? parseInt(count) : 0;
  }

  async reset(key: string): Promise<void> {
    await this.redis.del(key);
  }
}
```

#### **Étape 2 : Modifier hooks.server.ts**
```typescript
// src/hooks.server.ts - Remplacer le rate limiting en mémoire
import { RedisRateLimiter } from '$lib/utils/redis-rate-limiter';

const rateLimiter = new RedisRateLimiter();

// Remplacer la logique existante par :
if (event.request.method === 'POST') {
  const pathname = event.url.pathname;
  const clientIP = event.getClientAddress();

  for (const [route, limit] of Object.entries(RATE_LIMITS)) {
    if (pathname === route || pathname.includes(route)) {
      const key = `rate_limit:${clientIP}:${route}`;
      
      try {
        const result = await rateLimiter.checkLimit(key, limit.max, limit.window);
        
        if (!result.allowed) {
          
          
          const minutes = Math.floor(result.retryAfter! / 60);
          const seconds = result.retryAfter! % 60;
          
          event.request.headers.set('x-rate-limit-exceeded', 'true');
          event.request.headers.set('x-rate-limit-message',
            minutes > 0
              ? `Trop de tentatives. Veuillez attendre ${minutes}m ${seconds}s avant de réessayer.`
              : `Trop de tentatives. Veuillez attendre ${seconds}s avant de réessayer.`
          );
          event.request.headers.set('x-rate-limit-retry-after', result.retryAfter!.toString());
        }
      } catch (error) {
                // En cas d'erreur Redis, on laisse passer (fail open)
      }
      break;
    }
  }
}
```

### **Limites recommandées (garder les actuelles)**
- **Contact** : 3 tentatives/heure par IP
- **Register** : 5 tentatives/heure par IP
- **Login** : 10 tentatives/heure par IP
- **Forgot-password** : 3 tentatives/heure par IP
- **Custom/Product** : 5 tentatives/heure par IP

### **Avantages de la migration Redis**
- **Persistance** : Survit aux redémarrages du serveur
- **Scalabilité** : Fonctionne avec plusieurs instances
- **Monitoring** : Métriques Redis pour analyser les patterns
- **Flexibilité** : Ajustement des limites en temps réel

---

## ⚡ **3. Cache Cloudflare KV**

### **Migration depuis le cache en mémoire**

#### **Étape 1 : Configuration Cloudflare**
```bash
# Installer Wrangler CLI
npm install -g wrangler

# Login à Cloudflare
wrangler login

# Créer un KV namespace
wrangler kv:namespace create "PATTYLY_CACHE"
```

#### **Étape 2 : Variables d'environnement**
```bash
# Ajouter dans .env
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_KV_NAMESPACE_ID=your-namespace-id
```

#### **Étape 3 : Migration du code**
```typescript
// Remplacer src/lib/utils/catalog-cache.ts
export class CloudflareKVCache {
  async get(key: string): Promise<any | null> {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/storage/kv/namespaces/${CLOUDFLARE_KV_NAMESPACE_ID}/values/${key}`,
      {
        headers: {
          'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!response.ok) return null;
    return response.json();
  }

  async set(key: string, value: any, ttl: number): Promise<void> {
    await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/storage/kv/namespaces/${CLOUDFLARE_KV_NAMESPACE_ID}/values/${key}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(value)
      }
    );
  }
}
```

### **Avantages de Cloudflare KV**
- **Persistance** : Cache survit aux redémarrages
- **Global** : Cache partagé entre tous les serveurs
- **Performance** : Latence ultra-faible (< 10ms)
- **Scalabilité** : Gère des millions de requêtes

---

## 🗄️ **4. Base de données Supabase**

### **Migration de dev vers prod**
```bash
# Créer un nouveau projet Supabase
supabase projects create pattyly-prod

# Migrer le schéma
supabase db push --project-ref your-project-ref

# Migrer les données (si nécessaire)
supabase db dump --project-ref dev-ref > backup.sql
supabase db restore --project-ref prod-ref < backup.sql
```

### **Optimisations de production**
- [ ] Index sur toutes les colonnes de recherche
- [ ] Politiques RLS optimisées
- [ ] Monitoring des performances
- [ ] Sauvegardes automatiques configurées

---

## 🌐 **5. Déploiement et Infrastructure**

### **Plateforme de déploiement recommandée**
- **Vercel** : Déploiement automatique, edge functions
- **Netlify** : Alternative solide
- **Railway** : Pour les API backend

### **Configuration de déploiement**
```json
// vercel.json
{
  "functions": {
    "src/routes/**/*.ts": {
      "maxDuration": 30
    }
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        }
      ]
    }
  ]
}
```

---

## 📊 **6. Monitoring et Observabilité**

### **Métriques à surveiller**
- **Performance** : Temps de réponse, hit rate du cache
- **Sécurité** : Tentatives de connexion échouées, rate limit hits
- **Business** : Commandes créées, utilisateurs actifs
- **Infrastructure** : Utilisation CPU/RAM, erreurs 5xx

### **Outils recommandés**
- **Sentry** : Gestion des erreurs
- **LogRocket** : Replay des sessions utilisateur
- **PostHog** : Analytics et feature flags
- **UptimeRobot** : Monitoring de disponibilité

---

## 🔄 **7. Migration des données**

### **Checklist de migration**
- [ ] Sauvegarde complète de la base de dev
- [ ] Test de migration sur un environnement de staging
- [ ] Migration des utilisateurs et données critiques
- [ ] Validation post-migration
- [ ] Plan de rollback préparé

---

## 🧪 **8. Tests de production**

### **Tests de charge**
```bash
# Installer Artillery
npm install -g artillery

# Test de charge basique
artillery quick --count 100 --num 10 https://yourdomain.com
```

### **Tests de sécurité**
- [ ] Test d'injection SQL
- [ ] Test XSS
- [ ] Test CSRF
- [ ] Test d'authentification
- [ ] Test des permissions

### **Tests de rate limiting**
- [ ] Test des limites par IP sur les formulaires publics
- [ ] Test de persistance Redis après redémarrage
- [ ] Test de scalabilité avec plusieurs instances
- [ ] Test de fallback en cas d'erreur Redis
- [ ] Validation des headers de rate limiting

---

## 📈 **9. Optimisations post-déploiement**

### **Performance**
- [ ] CDN configuré pour les images
- [ ] Compression gzip/brotli activée
- [ ] Lazy loading des composants
- [ ] Bundle splitting optimisé

### **SEO**
- [ ] Meta tags dynamiques
- [ ] Sitemap généré automatiquement
- [ ] Schema.org markup
- [ ] Open Graph tags

---

## 🚨 **10. Plan d'urgence**

### **Scénarios de crise**
1. **Base de données inaccessible**
   - Fallback vers cache local
   - Mode maintenance activé

2. **Rate limiting trop agressif**
   - Ajustement des limites en temps réel
   - Whitelist des IPs critiques

3. **Cache défaillant**
   - Fallback vers Supabase direct
   - Monitoring des performances

### **Contacts d'urgence**
- **DevOps** : [contact]
- **Stripe Support** : [contact]
- **Supabase Support** : [contact]

---

## ✅ **Checklist finale**

### **Avant le déploiement**
- [ ] Tous les tests passent
- [ ] Variables d'environnement configurées
- [ ] Base de données migrée
- [ ] Cache configuré
- [ ] Rate limiting migré vers Redis et testé
- [ ] Système de cache en mémoire remplacé par Cloudflare KV

### **Après le déploiement**
- [ ] Monitoring activé
- [ ] Alertes configurées
- [ ] Tests de charge effectués
- [ ] Documentation mise à jour
- [ ] Formation de l'équipe

---

## 📚 **Ressources utiles**

- [Documentation Cloudflare KV](https://developers.cloudflare.com/workers/kv/)
- [Guide Supabase Production](https://supabase.com/docs/guides/deployment)
- [Best Practices Vercel](https://vercel.com/docs/concepts/projects/overview)
- [Redis Rate Limiting](https://redis.io/docs/manual/patterns/distributed-locks/)

---

## 🎯 **Priorités de mise en production**

1. **Phase 1** : Migration base + authentification
2. **Phase 2** : Rate limiting + cache Cloudflare
3. **Phase 3** : Monitoring + optimisations
4. **Phase 4** : Tests de charge + sécurité

---

*Dernière mise à jour : $(date)*
*Version : 1.0*
