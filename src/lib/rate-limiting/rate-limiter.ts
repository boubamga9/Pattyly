import { redis } from './redis';

export interface RateLimitConfig {
	max: number;
	window: number; // en ms
}

export interface RateLimitResult {
	isLimited: boolean;
	retryAfter?: number;
	message?: string;
}

export class RateLimiterRedis {
	/**
	 * Vérifie si une requête dépasse la limite de taux
	 */
	async checkRateLimit(
		clientIP: string, 
		route: string, 
		config: RateLimitConfig
	): Promise<RateLimitResult> {
		const key = `ratelimit:${clientIP}:${route}`;
		const ttlMs = config.window;

		try {
			// Incrémente le compteur
			const count = await redis.incr(key);

			// Si c'est la première requête, pose un TTL
			if (count === 1) {
				await redis.pexpire(key, ttlMs);
			}

			// Vérifie si la limite est dépassée
			if (count > config.max) {
				const retryAfter = Math.ceil((await redis.pttl(key)) / 1000);
				return {
					isLimited: true,
					retryAfter,
					message: this.formatRateLimitMessage(retryAfter),
				};
			}

			return { isLimited: false };
		} catch (error) {
			console.error('Rate limiter Redis error:', error);
			// En cas d'erreur Redis, on autorise la requête (fail-open)
			return { isLimited: false };
		}
	}

	/**
	 * Formate le message d'erreur de rate limiting
	 */
	private formatRateLimitMessage(remainingTime: number): string {
		const minutes = Math.floor(remainingTime / 60);
		const seconds = remainingTime % 60;

		if (minutes > 0) {
			return `Trop de tentatives. Veuillez attendre ${minutes}m ${seconds}s avant de réessayer.`;
		}
		return `Trop de tentatives. Veuillez attendre ${seconds}s avant de réessayer.`;
	}

	/**
	 * Obtient les statistiques de rate limiting pour une IP/route
	 */
	async getRateLimitStats(clientIP: string, route: string): Promise<{
		count: number;
		ttl: number;
	}> {
		const key = `ratelimit:${clientIP}:${route}`;
		
		try {
			const [count, ttl] = await Promise.all([
				redis.get(key),
				redis.pttl(key)
			]);

			return {
				count: parseInt(count || '0'),
				ttl: Math.ceil(ttl / 1000)
			};
		} catch (error) {
			console.error('Error getting rate limit stats:', error);
			return { count: 0, ttl: 0 };
		}
	}

	/**
	 * Reset le rate limiting pour une IP/route (utile pour les tests)
	 */
	async resetRateLimit(clientIP: string, route: string): Promise<void> {
		const key = `ratelimit:${clientIP}:${route}`;
		
		try {
			await redis.del(key);
		} catch (error) {
			console.error('Error resetting rate limit:', error);
		}
	}
}
