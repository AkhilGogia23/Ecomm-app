import { LRUCache } from "lru-cache";

const DEFAULT_TTL_MS = 5 * 60 * 1000;

const cache = new LRUCache<string, object>({
  max: 500,
  ttl: DEFAULT_TTL_MS,
});

export function getCache<T>(key: string): T | undefined {
  return cache.get(key) as T | undefined;
}

export function setCache<T extends object>(key: string, value: T, ttlMs?: number): void {
  cache.set(key, value, ttlMs ? { ttl: ttlMs } : undefined);
}

export function invalidateCache(prefix: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}

export function clearCache(): void {
  cache.clear();
}

export const CACHE_TTL = {
  PRODUCTS_LIST: 5 * 60 * 1000,
  PRODUCT_SLUG: 10 * 60 * 1000,
  CATEGORIES_TREE: 30 * 60 * 1000,
  SETTINGS: 60 * 60 * 1000,
  BANNERS: 15 * 60 * 1000,
};
