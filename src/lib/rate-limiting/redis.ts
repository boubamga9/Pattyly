import Redis from 'ioredis';
import { env } from '$env/dynamic/private';

// Configuration Redis
const redisConfig = {
	host: process.env.REDIS_HOST || 'localhost',
	port: parseInt(process.env.REDIS_PORT || '6379'),
	password: process.env.REDIS_PASSWORD,
	db: parseInt(process.env.REDIS_DB || '0'),
	retryDelayOnFailover: 100,
	maxRetriesPerRequest: 3,
	lazyConnect: true,
};

// Configuration Upstash
const upstashConfig = {
	host: process.env.UPSTASH_REDIS_REST_URL?.replace('https://', ''),
	port: 6380,
	password: process.env.UPSTASH_REDIS_REST_TOKEN,
	tls: {},
	retryDelayOnFailover: 100,
	maxRetriesPerRequest: 3,
	lazyConnect: true,
};

// Si REDIS_URL est fourni, l'utiliser directement
const redisUrl = env.REDIS_URL;

export const redis = redisUrl 
	? new Redis(redisUrl, {
		retryDelayOnFailover: 100,
		maxRetriesPerRequest: 3,
		lazyConnect: true,
	})
	: process.env.UPSTASH_REDIS_REST_URL
	? new Redis(upstashConfig)
	: new Redis(redisConfig);

// Gestion des erreurs Redis
redis.on('error', (error) => {
	console.error('Redis connection error:', error);
});

redis.on('connect', () => {
	console.log('✅ Redis connected successfully');
});

redis.on('ready', () => {
	console.log('✅ Redis ready to accept commands');
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
