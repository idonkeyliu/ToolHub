/**
 * Redis 管理模块
 * 负责 Redis 的连接管理和所有操作
 * 
 * 性能优化特性：
 * - 驱动懒加载：只在需要时加载 ioredis
 * - 性能监控：记录操作耗时
 */

import { getErrorMessage } from '../utils/error-handler.js';
import { driverLoader } from '../utils/lazy-loader.js';
import { perfMonitor } from '../utils/performance-monitor.js';

// ==================== 类型定义 ====================

export interface RedisConnectionConfig {
    id?: string;
    name: string;
    host: string;
    port: number;
    password?: string;
    database: number;
    tls?: boolean;
}

export interface RedisConnection {
    id: string;
    config: RedisConnectionConfig;
    client: any; // ioredis client instance
}

// ==================== Redis 管理器类 ====================

export class RedisManager {
    private connections: Map<string, RedisConnection> = new Map();
    private ioredis: any = null;
    private driverLoaded = false;

    /**
     * 加载 Redis 驱动（懒加载）
     */
    async loadDriver(): Promise<void> {
        if (this.driverLoaded) return;
        
        const stopTimer = perfMonitor.startTimer('redis.loadDriver');
        try {
            this.ioredis = await driverLoader.get('ioredis');
            if (this.ioredis) {
                console.log('[Redis] ioredis driver loaded');
                this.driverLoaded = true;
            }
        } catch (e) {
            console.log('[Redis] ioredis driver not available:', e);
        }
        stopTimer();
    }

    /**
     * 测试 Redis 连接
     */
    async testConnection(config: RedisConnectionConfig): Promise<{ success: boolean; error?: string }> {
        const stopTimer = perfMonitor.startTimer('redis.testConnection');
        
        // 按需加载驱动
        await this.loadDriver();
        
        if (!this.ioredis) {
            return { success: false, error: 'Redis 驱动未安装，请运行: npm install ioredis' };
        }
        
        return new Promise((resolve) => {
            const client = new this.ioredis({
                host: config.host,
                port: config.port,
                password: config.password || undefined,
                db: config.database,
                tls: config.tls ? {} : undefined,
                connectTimeout: 10000,
                maxRetriesPerRequest: 1,
                retryStrategy: () => null,
            });
            
            const timeout = setTimeout(() => {
                client.disconnect();
                stopTimer({ error: 'timeout' });
                resolve({ success: false, error: '连接超时' });
            }, 12000);
            
            client.on('error', (err: Error) => {
                clearTimeout(timeout);
                client.disconnect();
                stopTimer({ error: true });
                resolve({ success: false, error: err.message });
            });
            
            client.ping().then(() => {
                clearTimeout(timeout);
                client.quit();
                stopTimer();
                resolve({ success: true });
            }).catch((err: Error) => {
                clearTimeout(timeout);
                client.disconnect();
                stopTimer({ error: true });
                resolve({ success: false, error: err.message });
            });
        });
    }

    /**
     * 连接 Redis
     */
    async connect(config: RedisConnectionConfig): Promise<{ success: boolean; connectionId?: string; error?: string }> {
        const stopTimer = perfMonitor.startTimer('redis.connect');
        
        // 按需加载驱动
        await this.loadDriver();
        
        if (!this.ioredis) {
            return { success: false, error: 'Redis 驱动未安装' };
        }
        
        return new Promise((resolve) => {
            const connectionId = `redis_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
            const client = new this.ioredis({
                host: config.host,
                port: config.port,
                password: config.password || undefined,
                db: config.database,
                tls: config.tls ? {} : undefined,
                connectTimeout: 10000,
                maxRetriesPerRequest: 3,
                retryStrategy: (times: number) => {
                    if (times > 3) return null;
                    return Math.min(times * 200, 2000);
                },
            });
            
            const timeout = setTimeout(() => {
                client.disconnect();
                stopTimer({ error: 'timeout' });
                resolve({ success: false, error: '连接超时' });
            }, 15000);
            
            client.on('error', (err: Error) => {
                console.error('[Redis] Connection error:', err.message);
            });
            
            client.on('ready', () => {
                clearTimeout(timeout);
                this.connections.set(connectionId, { id: connectionId, config, client });
                stopTimer();
                resolve({ success: true, connectionId });
            });
            
            client.once('error', (err: Error) => {
                if (!this.connections.has(connectionId)) {
                    clearTimeout(timeout);
                    client.disconnect();
                    stopTimer({ error: true });
                    resolve({ success: false, error: err.message });
                }
            });
        });
    }

    /**
     * 断开 Redis 连接
     */
    async disconnect(connectionId: string): Promise<{ success: boolean; error?: string }> {
        try {
            const conn = this.connections.get(connectionId);
            if (!conn) {
                return { success: false, error: '连接不存在' };
            }
            await conn.client.quit();
            this.connections.delete(connectionId);
            return { success: true };
        } catch (e: unknown) {
            return { success: false, error: getErrorMessage(e) };
        }
    }

    /**
     * 获取性能统计
     */
    getPerformanceStats() {
        return perfMonitor.getAllStats();
    }

    /**
     * 选择数据库
     */
    async selectDB(connectionId: string, db: number): Promise<{ success: boolean; error?: string }> {
        try {
            const conn = this.connections.get(connectionId);
            if (!conn) {
                return { success: false, error: '连接不存在' };
            }
            await conn.client.select(db);
            return { success: true };
        } catch (e: unknown) {
            return { success: false, error: getErrorMessage(e) };
        }
    }

    /**
     * 扫描键
     */
    async scan(
        connectionId: string, 
        cursor: string, 
        pattern: string, 
        count: number
    ): Promise<{ success: boolean; cursor?: string; keys?: string[]; error?: string }> {
        try {
            const conn = this.connections.get(connectionId);
            if (!conn) {
                return { success: false, error: '连接不存在' };
            }
            const [newCursor, keys] = await conn.client.scan(cursor, 'MATCH', pattern, 'COUNT', count);
            return { success: true, cursor: newCursor, keys };
        } catch (e: unknown) {
            return { success: false, error: getErrorMessage(e) };
        }
    }

    /**
     * 获取键类型
     */
    async getType(connectionId: string, key: string): Promise<{ success: boolean; type?: string; error?: string }> {
        try {
            const conn = this.connections.get(connectionId);
            if (!conn) {
                return { success: false, error: '连接不存在' };
            }
            const type = await conn.client.type(key);
            return { success: true, type };
        } catch (e: unknown) {
            return { success: false, error: getErrorMessage(e) };
        }
    }

    /**
     * 获取 TTL
     */
    async getTTL(connectionId: string, key: string): Promise<{ success: boolean; ttl?: number; error?: string }> {
        try {
            const conn = this.connections.get(connectionId);
            if (!conn) {
                return { success: false, error: '连接不存在' };
            }
            const ttl = await conn.client.ttl(key);
            return { success: true, ttl };
        } catch (e: unknown) {
            return { success: false, error: getErrorMessage(e) };
        }
    }

    /**
     * 设置 TTL
     */
    async setTTL(connectionId: string, key: string, ttl: number): Promise<{ success: boolean; error?: string }> {
        try {
            const conn = this.connections.get(connectionId);
            if (!conn) {
                return { success: false, error: '连接不存在' };
            }
            if (ttl === -1) {
                await conn.client.persist(key);
            } else {
                await conn.client.expire(key, ttl);
            }
            return { success: true };
        } catch (e: unknown) {
            return { success: false, error: getErrorMessage(e) };
        }
    }

    /**
     * 删除键
     */
    async deleteKey(connectionId: string, key: string): Promise<{ success: boolean; error?: string }> {
        try {
            const conn = this.connections.get(connectionId);
            if (!conn) {
                return { success: false, error: '连接不存在' };
            }
            await conn.client.del(key);
            return { success: true };
        } catch (e: unknown) {
            return { success: false, error: getErrorMessage(e) };
        }
    }

    /**
     * 重命名键
     */
    async renameKey(connectionId: string, oldKey: string, newKey: string): Promise<{ success: boolean; error?: string }> {
        try {
            const conn = this.connections.get(connectionId);
            if (!conn) {
                return { success: false, error: '连接不存在' };
            }
            await conn.client.rename(oldKey, newKey);
            return { success: true };
        } catch (e: unknown) {
            return { success: false, error: getErrorMessage(e) };
        }
    }

    // ==================== String 操作 ====================

    async getString(connectionId: string, key: string): Promise<{ success: boolean; value?: string; error?: string }> {
        try {
            const conn = this.connections.get(connectionId);
            if (!conn) {
                return { success: false, error: '连接不存在' };
            }
            const value = await conn.client.get(key);
            return { success: true, value: value || '' };
        } catch (e: unknown) {
            return { success: false, error: getErrorMessage(e) };
        }
    }

    async setString(
        connectionId: string, 
        key: string, 
        value: string, 
        ttl?: number
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const conn = this.connections.get(connectionId);
            if (!conn) {
                return { success: false, error: '连接不存在' };
            }
            if (ttl && ttl > 0) {
                await conn.client.setex(key, ttl, value);
            } else {
                await conn.client.set(key, value);
            }
            return { success: true };
        } catch (e: unknown) {
            return { success: false, error: getErrorMessage(e) };
        }
    }

    // ==================== Hash 操作 ====================

    async getHash(connectionId: string, key: string): Promise<{ success: boolean; value?: Record<string, string>; error?: string }> {
        try {
            const conn = this.connections.get(connectionId);
            if (!conn) {
                return { success: false, error: '连接不存在' };
            }
            const value = await conn.client.hgetall(key);
            return { success: true, value: value || {} };
        } catch (e: unknown) {
            return { success: false, error: getErrorMessage(e) };
        }
    }

    async setHashField(
        connectionId: string, 
        key: string, 
        field: string, 
        value: string
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const conn = this.connections.get(connectionId);
            if (!conn) {
                return { success: false, error: '连接不存在' };
            }
            await conn.client.hset(key, field, value);
            return { success: true };
        } catch (e: unknown) {
            return { success: false, error: getErrorMessage(e) };
        }
    }

    async deleteHashField(connectionId: string, key: string, field: string): Promise<{ success: boolean; error?: string }> {
        try {
            const conn = this.connections.get(connectionId);
            if (!conn) {
                return { success: false, error: '连接不存在' };
            }
            await conn.client.hdel(key, field);
            return { success: true };
        } catch (e: unknown) {
            return { success: false, error: getErrorMessage(e) };
        }
    }

    // ==================== List 操作 ====================

    async getList(
        connectionId: string, 
        key: string, 
        start: number, 
        stop: number
    ): Promise<{ success: boolean; value?: string[]; total?: number; error?: string }> {
        try {
            const conn = this.connections.get(connectionId);
            if (!conn) {
                return { success: false, error: '连接不存在' };
            }
            const [value, total] = await Promise.all([
                conn.client.lrange(key, start, stop),
                conn.client.llen(key),
            ]);
            return { success: true, value, total };
        } catch (e: unknown) {
            return { success: false, error: getErrorMessage(e) };
        }
    }

    async pushList(
        connectionId: string, 
        key: string, 
        value: string, 
        position: 'left' | 'right'
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const conn = this.connections.get(connectionId);
            if (!conn) {
                return { success: false, error: '连接不存在' };
            }
            if (position === 'left') {
                await conn.client.lpush(key, value);
            } else {
                await conn.client.rpush(key, value);
            }
            return { success: true };
        } catch (e: unknown) {
            return { success: false, error: getErrorMessage(e) };
        }
    }

    async deleteListItem(
        connectionId: string, 
        key: string, 
        index: number, 
        count: number
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const conn = this.connections.get(connectionId);
            if (!conn) {
                return { success: false, error: '连接不存在' };
            }
            const placeholder = `__DELETED_${Date.now()}__`;
            await conn.client.lset(key, index, placeholder);
            await conn.client.lrem(key, count, placeholder);
            return { success: true };
        } catch (e: unknown) {
            return { success: false, error: getErrorMessage(e) };
        }
    }

    // ==================== Set 操作 ====================

    async getSet(connectionId: string, key: string): Promise<{ success: boolean; value?: string[]; error?: string }> {
        try {
            const conn = this.connections.get(connectionId);
            if (!conn) {
                return { success: false, error: '连接不存在' };
            }
            const value = await conn.client.smembers(key);
            return { success: true, value };
        } catch (e: unknown) {
            return { success: false, error: getErrorMessage(e) };
        }
    }

    async addSetMember(connectionId: string, key: string, member: string): Promise<{ success: boolean; error?: string }> {
        try {
            const conn = this.connections.get(connectionId);
            if (!conn) {
                return { success: false, error: '连接不存在' };
            }
            await conn.client.sadd(key, member);
            return { success: true };
        } catch (e: unknown) {
            return { success: false, error: getErrorMessage(e) };
        }
    }

    async removeSetMember(connectionId: string, key: string, member: string): Promise<{ success: boolean; error?: string }> {
        try {
            const conn = this.connections.get(connectionId);
            if (!conn) {
                return { success: false, error: '连接不存在' };
            }
            await conn.client.srem(key, member);
            return { success: true };
        } catch (e: unknown) {
            return { success: false, error: getErrorMessage(e) };
        }
    }

    // ==================== ZSet 操作 ====================

    async getZSet(
        connectionId: string, 
        key: string, 
        withScores: boolean
    ): Promise<{ success: boolean; value?: Array<{ member: string; score: number }>; total?: number; error?: string }> {
        try {
            const conn = this.connections.get(connectionId);
            if (!conn) {
                return { success: false, error: '连接不存在' };
            }
            const total = await conn.client.zcard(key);
            if (withScores) {
                const raw = await conn.client.zrange(key, 0, 99, 'WITHSCORES');
                const value: Array<{ member: string; score: number }> = [];
                for (let i = 0; i < raw.length; i += 2) {
                    value.push({ member: raw[i], score: parseFloat(raw[i + 1]) });
                }
                return { success: true, value, total };
            } else {
                const members = await conn.client.zrange(key, 0, 99);
                return { success: true, value: members.map((m: string) => ({ member: m, score: 0 })), total };
            }
        } catch (e: unknown) {
            return { success: false, error: getErrorMessage(e) };
        }
    }

    async addZSetMember(
        connectionId: string, 
        key: string, 
        member: string, 
        score: number
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const conn = this.connections.get(connectionId);
            if (!conn) {
                return { success: false, error: '连接不存在' };
            }
            await conn.client.zadd(key, score, member);
            return { success: true };
        } catch (e: unknown) {
            return { success: false, error: getErrorMessage(e) };
        }
    }

    async removeZSetMember(connectionId: string, key: string, member: string): Promise<{ success: boolean; error?: string }> {
        try {
            const conn = this.connections.get(connectionId);
            if (!conn) {
                return { success: false, error: '连接不存在' };
            }
            await conn.client.zrem(key, member);
            return { success: true };
        } catch (e: unknown) {
            return { success: false, error: getErrorMessage(e) };
        }
    }

    // ==================== 高级操作 ====================

    async executeCommand(connectionId: string, command: string): Promise<{ success: boolean; result?: any; error?: string }> {
        try {
            const conn = this.connections.get(connectionId);
            if (!conn) {
                return { success: false, error: '连接不存在' };
            }
            const parts = command.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
            const cmd = parts[0]?.toUpperCase();
            const args = parts.slice(1).map(arg => arg.replace(/^"|"$/g, ''));
            
            if (!cmd) {
                return { success: false, error: '无效命令' };
            }
            
            const result = await conn.client.call(cmd, ...args);
            return { success: true, result };
        } catch (e: unknown) {
            return { success: false, error: getErrorMessage(e) };
        }
    }

    async dbSize(connectionId: string): Promise<{ success: boolean; size?: number; error?: string }> {
        try {
            const conn = this.connections.get(connectionId);
            if (!conn) {
                return { success: false, error: '连接不存在' };
            }
            const size = await conn.client.dbsize();
            return { success: true, size };
        } catch (e: unknown) {
            return { success: false, error: getErrorMessage(e) };
        }
    }

    // ==================== 管理方法 ====================

    getConnections(): RedisConnection[] {
        return Array.from(this.connections.values());
    }

    getConnection(connectionId: string): RedisConnection | undefined {
        return this.connections.get(connectionId);
    }

    async closeAll(): Promise<void> {
        const closePromises = Array.from(this.connections.keys()).map(id => this.disconnect(id));
        await Promise.allSettled(closePromises);
    }
}

// 导出单例
export const redisManager = new RedisManager();
