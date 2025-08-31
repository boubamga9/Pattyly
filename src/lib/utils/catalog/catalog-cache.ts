/**
 * Cache en mémoire pour le catalogue des boutiques
 * Utilise la version du catalogue pour invalider automatiquement le cache
 */
export class CatalogCache {
    private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
    private readonly DEFAULT_TTL = 3600; // 1 heure en secondes

    /**
     * Récupère des données du cache
     * @param key Clé de cache (ex: shop:{id}:v{version})
     * @returns Les données mises en cache ou null si expiré/inexistant
     */
    async get(key: string): Promise<any | null> {
        const cached = this.cache.get(key);

        if (!cached) {
            return null; // Pas en cache
        }

        const now = Date.now();
        const isExpired = (now - cached.timestamp) > (cached.ttl * 1000);

        if (isExpired) {
            this.cache.delete(key); // Nettoyer le cache expiré
            return null;
        }

        return cached.data;
    }

    /**
     * Stocke des données dans le cache
     * @param key Clé de cache
     * @param data Données à stocker
     * @param ttl Durée de vie en secondes (optionnel, défaut: 1 heure)
     */
    async set(key: string, data: any, ttl: number = this.DEFAULT_TTL): Promise<void> {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl
        });

        // Nettoyer automatiquement après expiration
        setTimeout(() => {
            this.cache.delete(key);
        }, ttl * 1000);
    }

    /**
     * Supprime une entrée du cache
     * @param key Clé de cache
     */
    async delete(key: string): Promise<void> {
        this.cache.delete(key);
    }

    /**
     * Vide tout le cache
     */
    async clear(): Promise<void> {
        this.cache.clear();
    }

    /**
     * Récupère des statistiques du cache
     */
    getStats(): { size: number; keys: string[] } {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }

    /**
     * Génère une clé de cache pour une boutique
     * @param shopId ID de la boutique
     * @param catalogVersion Version du catalogue
     * @returns Clé de cache formatée
     */
    static generateKey(shopId: string, catalogVersion: number): string {
        return `shop:${shopId}:v${catalogVersion}`;
    }
}

// Instance singleton du cache
export const catalogCache = new CatalogCache();
