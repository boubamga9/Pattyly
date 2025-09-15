// Rate limiting configuration
export const RATE_LIMITS = {
    '/contact': { max: 3, window: 3600000 }, // 1 hour
    '/register': { max: 10, window: 3600000 }, // 1 hour
    '/login': { max: 10, window: 3600000 }, // 1 hour
    '/forgot-password': { max: 5, window: 3600000 }, // 1 hour
    '/custom': { max: 10, window: 3600000 }, // 1 hour
    '/product': { max: 10, window: 3600000 } // 1 hour
} as const;

export type RateLimitConfig = {
    max: number;
    window: number;
};

export type RateLimits = typeof RATE_LIMITS;
