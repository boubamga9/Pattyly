import Redis from 'ioredis';

export const redis = process.env.UPSTASH_REDIS_REST_URL
	? new Redis(process.env.UPSTASH_REDIS_REST_URL)
	: new Redis("redis://localhost:6379");

// Gestion des erreurs Redis
redis.on('error', (error) => {
	console.error('Redis connection error:', error);
});

// Fonction pour tester la connexion
export async function testRedisConnection(): Promise<boolean> {
	try {
		await redis.ping();
		return true;
	} catch (error) {
		console.error('Redis connection test failed:', error);
		return false;
	}
}
