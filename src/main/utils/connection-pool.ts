/**
 * 连接池管理器
 * 提供数据库连接的复用和管理
 */

export interface PoolOptions {
    maxSize: number;           // 最大连接数
    minSize: number;           // 最小连接数
    acquireTimeout: number;    // 获取连接超时（毫秒）
    idleTimeout: number;       // 空闲超时（毫秒）
    maxWaitingClients: number; // 最大等待队列
}

interface PooledConnection<T> {
    connection: T;
    id: string;
    createdAt: number;
    lastUsedAt: number;
    useCount: number;
    inUse: boolean;
}

interface WaitingClient<T> {
    resolve: (conn: T) => void;
    reject: (err: Error) => void;
    timeout: NodeJS.Timeout;
}

export class ConnectionPool<T> {
    private pool: Map<string, PooledConnection<T>> = new Map();
    private waitingQueue: WaitingClient<T>[] = [];
    private options: PoolOptions;
    private connectionFactory: () => Promise<T>;
    private connectionDestroyer: (conn: T) => Promise<void>;
    private connectionValidator: (conn: T) => Promise<boolean>;
    private idCounter = 0;
    private cleanupInterval: NodeJS.Timeout | null = null;

    private stats = {
        created: 0,
        destroyed: 0,
        acquired: 0,
        released: 0,
        timeouts: 0,
        validationFailures: 0,
    };

    constructor(
        factory: () => Promise<T>,
        destroyer: (conn: T) => Promise<void>,
        validator: (conn: T) => Promise<boolean>,
        options: Partial<PoolOptions> = {}
    ) {
        this.connectionFactory = factory;
        this.connectionDestroyer = destroyer;
        this.connectionValidator = validator;
        this.options = {
            maxSize: options.maxSize ?? 10,
            minSize: options.minSize ?? 2,
            acquireTimeout: options.acquireTimeout ?? 30000,
            idleTimeout: options.idleTimeout ?? 60000,
            maxWaitingClients: options.maxWaitingClients ?? 100,
        };

        // 启动清理定时器
        this.startCleanup();
    }

    /**
     * 获取连接
     */
    async acquire(): Promise<T> {
        // 1. 尝试获取空闲连接
        const idleConn = this.getIdleConnection();
        if (idleConn) {
            idleConn.inUse = true;
            idleConn.lastUsedAt = Date.now();
            idleConn.useCount++;
            this.stats.acquired++;
            return idleConn.connection;
        }

        // 2. 如果池未满，创建新连接
        if (this.pool.size < this.options.maxSize) {
            const conn = await this.createConnection();
            this.stats.acquired++;
            return conn;
        }

        // 3. 池已满，加入等待队列
        if (this.waitingQueue.length >= this.options.maxWaitingClients) {
            throw new Error('Connection pool exhausted and waiting queue is full');
        }

        return this.waitForConnection();
    }

    /**
     * 释放连接
     */
    async release(connection: T): Promise<void> {
        // 找到对应的池化连接
        let pooledConn: PooledConnection<T> | undefined;
        for (const [id, conn] of this.pool) {
            if (conn.connection === connection) {
                pooledConn = conn;
                break;
            }
        }

        if (!pooledConn) {
            console.warn('[ConnectionPool] Releasing unknown connection');
            return;
        }

        pooledConn.inUse = false;
        pooledConn.lastUsedAt = Date.now();
        this.stats.released++;

        // 检查是否有等待的客户端
        if (this.waitingQueue.length > 0) {
            const waiting = this.waitingQueue.shift()!;
            clearTimeout(waiting.timeout);
            pooledConn.inUse = true;
            pooledConn.useCount++;
            this.stats.acquired++;
            waiting.resolve(pooledConn.connection);
        }
    }

    /**
     * 销毁连接
     */
    async destroy(connection: T): Promise<void> {
        for (const [id, pooledConn] of this.pool) {
            if (pooledConn.connection === connection) {
                await this.connectionDestroyer(pooledConn.connection);
                this.pool.delete(id);
                this.stats.destroyed++;
                break;
            }
        }
    }

    /**
     * 清空连接池
     */
    async drain(): Promise<void> {
        // 停止清理定时器
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }

        // 拒绝所有等待的客户端
        for (const waiting of this.waitingQueue) {
            clearTimeout(waiting.timeout);
            waiting.reject(new Error('Connection pool is draining'));
        }
        this.waitingQueue = [];

        // 销毁所有连接
        for (const [id, pooledConn] of this.pool) {
            try {
                await this.connectionDestroyer(pooledConn.connection);
                this.stats.destroyed++;
            } catch (e) {
                console.error(`[ConnectionPool] Error destroying connection ${id}:`, e);
            }
        }
        this.pool.clear();
    }

    /**
     * 获取池状态
     */
    getStatus() {
        let idle = 0;
        let inUse = 0;

        for (const conn of this.pool.values()) {
            if (conn.inUse) {
                inUse++;
            } else {
                idle++;
            }
        }

        return {
            size: this.pool.size,
            idle,
            inUse,
            waiting: this.waitingQueue.length,
            maxSize: this.options.maxSize,
            ...this.stats,
        };
    }

    /**
     * 获取空闲连接
     */
    private getIdleConnection(): PooledConnection<T> | undefined {
        for (const conn of this.pool.values()) {
            if (!conn.inUse) {
                return conn;
            }
        }
        return undefined;
    }

    /**
     * 创建新连接
     */
    private async createConnection(): Promise<T> {
        const id = `conn_${++this.idCounter}`;
        const connection = await this.connectionFactory();
        
        const pooledConn: PooledConnection<T> = {
            connection,
            id,
            createdAt: Date.now(),
            lastUsedAt: Date.now(),
            useCount: 1,
            inUse: true,
        };
        
        this.pool.set(id, pooledConn);
        this.stats.created++;
        
        return connection;
    }

    /**
     * 等待连接
     */
    private waitForConnection(): Promise<T> {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                const index = this.waitingQueue.findIndex(w => w.resolve === resolve);
                if (index !== -1) {
                    this.waitingQueue.splice(index, 1);
                }
                this.stats.timeouts++;
                reject(new Error('Connection acquire timeout'));
            }, this.options.acquireTimeout);

            this.waitingQueue.push({ resolve, reject, timeout });
        });
    }

    /**
     * 启动清理定时器
     */
    private startCleanup(): void {
        this.cleanupInterval = setInterval(async () => {
            await this.cleanup();
        }, 30000); // 每 30 秒清理一次
    }

    /**
     * 清理空闲超时的连接
     */
    private async cleanup(): Promise<void> {
        const now = Date.now();
        const toRemove: string[] = [];

        for (const [id, conn] of this.pool) {
            // 跳过正在使用的连接
            if (conn.inUse) continue;

            // 检查空闲超时
            if (now - conn.lastUsedAt > this.options.idleTimeout) {
                // 保持最小连接数
                if (this.pool.size - toRemove.length > this.options.minSize) {
                    toRemove.push(id);
                }
            }
        }

        // 销毁超时连接
        for (const id of toRemove) {
            const conn = this.pool.get(id);
            if (conn) {
                try {
                    await this.connectionDestroyer(conn.connection);
                    this.pool.delete(id);
                    this.stats.destroyed++;
                    console.log(`[ConnectionPool] Cleaned up idle connection ${id}`);
                } catch (e) {
                    console.error(`[ConnectionPool] Error cleaning up connection ${id}:`, e);
                }
            }
        }
    }

    /**
     * 验证连接
     */
    async validate(connection: T): Promise<boolean> {
        try {
            return await this.connectionValidator(connection);
        } catch (e) {
            this.stats.validationFailures++;
            return false;
        }
    }

    /**
     * 使用连接执行操作（自动获取和释放）
     */
    async withConnection<R>(fn: (conn: T) => Promise<R>): Promise<R> {
        const conn = await this.acquire();
        try {
            return await fn(conn);
        } finally {
            await this.release(conn);
        }
    }
}
