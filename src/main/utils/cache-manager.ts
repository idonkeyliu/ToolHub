/**
 * 缓存管理器
 * 提供 LRU 缓存功能，用于缓存查询结果
 */

export interface CacheOptions {
    maxSize: number;        // 最大缓存条目数
    ttl: number;            // 缓存过期时间（毫秒）
    onEvict?: (key: string, value: any) => void;  // 驱逐回调
}

interface CacheEntry<T> {
    value: T;
    timestamp: number;
    hits: number;
}

export class CacheManager<T = any> {
    private cache: Map<string, CacheEntry<T>> = new Map();
    private options: CacheOptions;
    private stats = {
        hits: 0,
        misses: 0,
        evictions: 0,
    };

    constructor(options: Partial<CacheOptions> = {}) {
        this.options = {
            maxSize: options.maxSize ?? 1000,
            ttl: options.ttl ?? 5 * 60 * 1000, // 默认 5 分钟
            onEvict: options.onEvict,
        };
    }

    /**
     * 获取缓存
     */
    get(key: string): T | undefined {
        const entry = this.cache.get(key);
        
        if (!entry) {
            this.stats.misses++;
            return undefined;
        }

        // 检查是否过期
        if (Date.now() - entry.timestamp > this.options.ttl) {
            this.delete(key);
            this.stats.misses++;
            return undefined;
        }

        // 更新访问信息（LRU）
        entry.hits++;
        this.cache.delete(key);
        this.cache.set(key, entry);
        
        this.stats.hits++;
        return entry.value;
    }

    /**
     * 设置缓存
     */
    set(key: string, value: T): void {
        // 如果已存在，先删除
        if (this.cache.has(key)) {
            this.cache.delete(key);
        }

        // 检查是否需要驱逐
        while (this.cache.size >= this.options.maxSize) {
            this.evictOldest();
        }

        this.cache.set(key, {
            value,
            timestamp: Date.now(),
            hits: 0,
        });
    }

    /**
     * 删除缓存
     */
    delete(key: string): boolean {
        const entry = this.cache.get(key);
        if (entry && this.options.onEvict) {
            this.options.onEvict(key, entry.value);
        }
        return this.cache.delete(key);
    }

    /**
     * 检查是否存在
     */
    has(key: string): boolean {
        const entry = this.cache.get(key);
        if (!entry) return false;
        
        // 检查是否过期
        if (Date.now() - entry.timestamp > this.options.ttl) {
            this.delete(key);
            return false;
        }
        
        return true;
    }

    /**
     * 清空缓存
     */
    clear(): void {
        if (this.options.onEvict) {
            for (const [key, entry] of this.cache) {
                this.options.onEvict(key, entry.value);
            }
        }
        this.cache.clear();
    }

    /**
     * 清理过期条目
     */
    cleanup(): number {
        const now = Date.now();
        let cleaned = 0;
        
        for (const [key, entry] of this.cache) {
            if (now - entry.timestamp > this.options.ttl) {
                this.delete(key);
                cleaned++;
            }
        }
        
        return cleaned;
    }

    /**
     * 获取缓存统计
     */
    getStats() {
        return {
            ...this.stats,
            size: this.cache.size,
            maxSize: this.options.maxSize,
            hitRate: this.stats.hits + this.stats.misses > 0
                ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2) + '%'
                : '0%',
        };
    }

    /**
     * 重置统计
     */
    resetStats(): void {
        this.stats = { hits: 0, misses: 0, evictions: 0 };
    }

    /**
     * 获取所有键
     */
    keys(): string[] {
        return Array.from(this.cache.keys());
    }

    /**
     * 获取缓存大小
     */
    get size(): number {
        return this.cache.size;
    }

    /**
     * 驱逐最旧的条目
     */
    private evictOldest(): void {
        const firstKey = this.cache.keys().next().value;
        if (firstKey) {
            this.delete(firstKey);
            this.stats.evictions++;
        }
    }

    /**
     * 根据前缀删除缓存
     */
    deleteByPrefix(prefix: string): number {
        let deleted = 0;
        for (const key of this.cache.keys()) {
            if (key.startsWith(prefix)) {
                this.delete(key);
                deleted++;
            }
        }
        return deleted;
    }

    /**
     * 获取或设置（如果不存在则调用 factory 创建）
     */
    async getOrSet(key: string, factory: () => Promise<T>): Promise<T> {
        const cached = this.get(key);
        if (cached !== undefined) {
            return cached;
        }
        
        const value = await factory();
        this.set(key, value);
        return value;
    }
}

// 创建全局缓存实例
export const queryCache = new CacheManager({
    maxSize: 500,
    ttl: 2 * 60 * 1000, // 查询缓存 2 分钟
});

export const schemaCache = new CacheManager({
    maxSize: 200,
    ttl: 10 * 60 * 1000, // 表结构缓存 10 分钟
});

export const metadataCache = new CacheManager({
    maxSize: 100,
    ttl: 5 * 60 * 1000, // 元数据缓存 5 分钟
});
