/**
 * MongoDB 管理模块
 * 负责 MongoDB 的连接管理和所有操作
 */

import { getErrorMessage } from '../utils/error-handler.js';

// ==================== 类型定义 ====================

export interface MongoConnectionConfig {
    id?: string;
    name: string;
    mode: 'standard' | 'uri';
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    authDB?: string;
    uri?: string;
    tls?: boolean;
}

export interface MongoConnection {
    id: string;
    config: MongoConnectionConfig;
    client: any; // MongoClient instance
}

// ==================== MongoDB 管理器类 ====================

export class MongoManager {
    private connections: Map<string, MongoConnection> = new Map();
    private mongodb: any = null;

    /**
     * 加载 MongoDB 驱动
     */
    async loadDriver(): Promise<void> {
        try {
            this.mongodb = await import('mongodb');
            console.log('[MongoDB] mongodb driver loaded');
        } catch (e) {
            console.log('[MongoDB] mongodb driver not available:', e);
        }
    }

    /**
     * 构建 MongoDB URI
     */
    private buildUri(config: MongoConnectionConfig): string {
        if (config.mode === 'uri' && config.uri) {
            return config.uri;
        }
        
        let uri = 'mongodb://';
        if (config.user && config.password) {
            uri += `${encodeURIComponent(config.user)}:${encodeURIComponent(config.password)}@`;
        }
        uri += `${config.host || 'localhost'}:${config.port || 27017}`;
        uri += `/?authSource=${config.authDB || 'admin'}`;
        if (config.tls) {
            uri += '&tls=true';
        }
        return uri;
    }

    /**
     * 测试 MongoDB 连接
     */
    async testConnection(config: MongoConnectionConfig): Promise<{ success: boolean; error?: string }> {
        if (!this.mongodb) {
            return { success: false, error: 'MongoDB 驱动未安装，请运行: npm install mongodb' };
        }
        
        try {
            const uri = this.buildUri(config);
            const client = new this.mongodb.MongoClient(uri, {
                connectTimeoutMS: 10000,
                serverSelectionTimeoutMS: 10000,
            });
            await client.connect();
            await client.db('admin').command({ ping: 1 });
            await client.close();
            return { success: true };
        } catch (e: unknown) {
            return { success: false, error: getErrorMessage(e) };
        }
    }

    /**
     * 连接 MongoDB
     */
    async connect(config: MongoConnectionConfig): Promise<{ success: boolean; connectionId?: string; error?: string }> {
        if (!this.mongodb) {
            return { success: false, error: 'MongoDB 驱动未安装' };
        }
        
        try {
            const connectionId = `mongo_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
            const uri = this.buildUri(config);
            const client = new this.mongodb.MongoClient(uri, {
                connectTimeoutMS: 15000,
                serverSelectionTimeoutMS: 15000,
            });
            await client.connect();
            this.connections.set(connectionId, { id: connectionId, config, client });
            return { success: true, connectionId };
        } catch (e: unknown) {
            return { success: false, error: getErrorMessage(e) };
        }
    }

    /**
     * 断开 MongoDB 连接
     */
    async disconnect(connectionId: string): Promise<{ success: boolean; error?: string }> {
        try {
            const conn = this.connections.get(connectionId);
            if (!conn) {
                return { success: false, error: '连接不存在' };
            }
            await conn.client.close();
            this.connections.delete(connectionId);
            return { success: true };
        } catch (e: unknown) {
            return { success: false, error: getErrorMessage(e) };
        }
    }

    /**
     * 获取数据库列表
     */
    async listDatabases(connectionId: string): Promise<{ success: boolean; databases?: string[]; error?: string }> {
        try {
            const conn = this.connections.get(connectionId);
            if (!conn) {
                return { success: false, error: '连接不存在' };
            }
            const result = await conn.client.db('admin').admin().listDatabases();
            const databases = result.databases.map((db: any) => db.name);
            return { success: true, databases };
        } catch (e: unknown) {
            return { success: false, error: getErrorMessage(e) };
        }
    }

    /**
     * 获取集合列表
     */
    async listCollections(connectionId: string, database: string): Promise<{ success: boolean; collections?: string[]; error?: string }> {
        try {
            const conn = this.connections.get(connectionId);
            if (!conn) {
                return { success: false, error: '连接不存在' };
            }
            const collections = await conn.client.db(database).listCollections().toArray();
            return { success: true, collections: collections.map((c: any) => c.name) };
        } catch (e: unknown) {
            return { success: false, error: getErrorMessage(e) };
        }
    }

    /**
     * 获取集合统计信息
     */
    async getCollectionStats(
        connectionId: string, 
        database: string, 
        collection: string
    ): Promise<{ success: boolean; stats?: { count: number; size: number; avgObjSize: number }; error?: string }> {
        try {
            const conn = this.connections.get(connectionId);
            if (!conn) {
                return { success: false, error: '连接不存在' };
            }
            const stats = await conn.client.db(database).collection(collection).stats();
            return { 
                success: true, 
                stats: { 
                    count: stats.count || 0, 
                    size: stats.size || 0, 
                    avgObjSize: stats.avgObjSize || 0 
                } 
            };
        } catch (e: unknown) {
            return { success: false, error: getErrorMessage(e) };
        }
    }

    /**
     * 查找文档
     */
    async findDocuments(
        connectionId: string,
        database: string,
        collection: string,
        filterStr: string,
        sortStr: string,
        skip: number,
        limit: number
    ): Promise<{ success: boolean; documents?: any[]; total?: number; error?: string }> {
        try {
            const conn = this.connections.get(connectionId);
            if (!conn) {
                return { success: false, error: '连接不存在' };
            }
            
            const filter = JSON.parse(filterStr || '{}');
            const sort = JSON.parse(sortStr || '{}');
            
            const coll = conn.client.db(database).collection(collection);
            const [documents, total] = await Promise.all([
                coll.find(filter).sort(sort).skip(skip).limit(limit).toArray(),
                coll.countDocuments(filter),
            ]);
            
            return { success: true, documents, total };
        } catch (e: unknown) {
            return { success: false, error: getErrorMessage(e) };
        }
    }

    /**
     * 插入文档
     */
    async insertDocument(
        connectionId: string,
        database: string,
        collection: string,
        documentStr: string
    ): Promise<{ success: boolean; insertedId?: string; error?: string }> {
        try {
            const conn = this.connections.get(connectionId);
            if (!conn) {
                return { success: false, error: '连接不存在' };
            }
            
            const document = JSON.parse(documentStr);
            const result = await conn.client.db(database).collection(collection).insertOne(document);
            return { success: true, insertedId: result.insertedId.toString() };
        } catch (e: unknown) {
            return { success: false, error: getErrorMessage(e) };
        }
    }

    /**
     * 更新文档
     */
    async updateDocument(
        connectionId: string,
        database: string,
        collection: string,
        id: string,
        documentStr: string
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const conn = this.connections.get(connectionId);
            if (!conn) {
                return { success: false, error: '连接不存在' };
            }
            
            const document = JSON.parse(documentStr);
            delete document._id;
            
            let objectId;
            try {
                objectId = new this.mongodb.ObjectId(id);
            } catch {
                objectId = id;
            }
            
            await conn.client.db(database).collection(collection).replaceOne({ _id: objectId }, document);
            return { success: true };
        } catch (e: unknown) {
            return { success: false, error: getErrorMessage(e) };
        }
    }

    /**
     * 删除文档
     */
    async deleteDocument(
        connectionId: string,
        database: string,
        collection: string,
        id: string
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const conn = this.connections.get(connectionId);
            if (!conn) {
                return { success: false, error: '连接不存在' };
            }
            
            let objectId;
            try {
                objectId = new this.mongodb.ObjectId(id);
            } catch {
                objectId = id;
            }
            
            await conn.client.db(database).collection(collection).deleteOne({ _id: objectId });
            return { success: true };
        } catch (e: unknown) {
            return { success: false, error: getErrorMessage(e) };
        }
    }

    /**
     * 获取索引列表
     */
    async getIndexes(
        connectionId: string,
        database: string,
        collection: string
    ): Promise<{ success: boolean; indexes?: Array<{ name: string; key: Record<string, number> }>; error?: string }> {
        try {
            const conn = this.connections.get(connectionId);
            if (!conn) {
                return { success: false, error: '连接不存在' };
            }
            
            const indexes = await conn.client.db(database).collection(collection).indexes();
            return { 
                success: true, 
                indexes: indexes.map((idx: any) => ({ name: idx.name, key: idx.key })) 
            };
        } catch (e: unknown) {
            return { success: false, error: getErrorMessage(e) };
        }
    }

    /**
     * 执行命令
     */
    async runCommand(
        connectionId: string,
        database: string,
        commandStr: string
    ): Promise<{ success: boolean; result?: any; error?: string }> {
        try {
            const conn = this.connections.get(connectionId);
            if (!conn) {
                return { success: false, error: '连接不存在' };
            }
            
            let command;
            try {
                command = JSON.parse(commandStr);
            } catch {
                return { success: false, error: '请输入有效的 JSON 命令，如 {"ping": 1}' };
            }
            
            const result = await conn.client.db(database).command(command);
            return { success: true, result };
        } catch (e: unknown) {
            return { success: false, error: getErrorMessage(e) };
        }
    }

    /**
     * 删除集合
     */
    async dropCollection(
        connectionId: string,
        database: string,
        collection: string
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const conn = this.connections.get(connectionId);
            if (!conn) {
                return { success: false, error: '连接不存在' };
            }
            await conn.client.db(database).collection(collection).drop();
            return { success: true };
        } catch (e: unknown) {
            return { success: false, error: getErrorMessage(e) };
        }
    }

    /**
     * 创建集合
     */
    async createCollection(
        connectionId: string,
        database: string,
        collection: string
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const conn = this.connections.get(connectionId);
            if (!conn) {
                return { success: false, error: '连接不存在' };
            }
            await conn.client.db(database).createCollection(collection);
            return { success: true };
        } catch (e: unknown) {
            return { success: false, error: getErrorMessage(e) };
        }
    }

    // ==================== 管理方法 ====================

    getConnections(): MongoConnection[] {
        return Array.from(this.connections.values());
    }

    getConnection(connectionId: string): MongoConnection | undefined {
        return this.connections.get(connectionId);
    }

    async closeAll(): Promise<void> {
        const closePromises = Array.from(this.connections.keys()).map(id => this.disconnect(id));
        await Promise.allSettled(closePromises);
    }
}

// 导出单例
export const mongoManager = new MongoManager();
