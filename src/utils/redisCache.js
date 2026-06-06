import { createClient } from 'redis';

export let isRedisConnected = false;
let redisClient = null;

// Local Fallback memory cache
const localCache = new Map();

export async function connectRedis() {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    redisClient = createClient({ 
        url,
        socket: { reconnectStrategy: false }
    });

    redisClient.on('error', (err) => {
        if (isRedisConnected) {
            console.log(`[warn]: Redis connection lost. Falling back to local memory cache.`);
        }
        isRedisConnected = false;
    });

    try {
        await redisClient.connect();
        isRedisConnected = true;
        console.log(`[info]: Redis connected successfully!`);
    } catch (err) {
        isRedisConnected = false;
        console.log(`[warn]: Redis connection failed. Running in Local Memory Cache mode.`);
    }
}

export async function getRedisPing() {
    if (!isRedisConnected || !redisClient) return -1;
    try {
        const start = Date.now();
        await redisClient.ping();
        return Date.now() - start;
    } catch {
        return -1;
    }
}

export const cache = {
    set: async (key, value, expirySeconds = 0) => {
        if (isRedisConnected && redisClient) {
            try {
                if (expirySeconds > 0) {
                    await redisClient.setEx(key, expirySeconds, JSON.stringify(value));
                } else {
                    await redisClient.set(key, JSON.stringify(value));
                }
                return;
            } catch (err) {
                // Silently fallback if Redis errors during operation
            }
        }
        
        // Local Fallback
        localCache.set(key, {
            value,
            expiry: expirySeconds > 0 ? Date.now() + (expirySeconds * 1000) : null
        });
    },

    get: async (key) => {
        if (isRedisConnected && redisClient) {
            try {
                const data = await redisClient.get(key);
                return data ? JSON.parse(data) : null;
            } catch (err) {
                // Fallback
            }
        }

        // Local Fallback
        const data = localCache.get(key);
        if (!data) return null;

        if (data.expiry && Date.now() > data.expiry) {
            localCache.delete(key);
            return null;
        }

        return data.value;
    },

    delete: async (key) => {
        if (isRedisConnected && redisClient) {
            try {
                await redisClient.del(key);
            } catch (err) {}
        }
        localCache.delete(key);
    }
};
