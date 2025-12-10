import { app, BrowserWindow, Menu, dialog, shell, session, ipcMain, screen } from 'electron';
import type { MenuItemConstructorOptions } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import Store from 'electron-store';

// Recreate __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 数据库连接管理
interface DBConnectionConfig {
    id?: string;
    name: string;
    type: 'mysql' | 'postgresql' | 'sqlite';
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    database?: string;
    sqlitePath?: string;
}

interface DBConnection {
    id: string;
    config: DBConnectionConfig;
    client: any;
}

const dbConnections: Map<string, DBConnection> = new Map();

// 动态导入数据库驱动
let mysql2: any = null;
let pg: any = null;
let betterSqlite3: any = null;

async function loadDBDrivers() {
    try {
        mysql2 = await import('mysql2/promise');
        console.log('[DB] MySQL driver loaded');
    } catch (e) {
        console.log('[DB] MySQL driver not available:', e);
    }
    
    try {
        pg = await import('pg');
        console.log('[DB] PostgreSQL driver loaded');
    } catch (e) {
        console.log('[DB] PostgreSQL driver not available:', e);
    }
    
    try {
        betterSqlite3 = (await import('better-sqlite3')).default;
        console.log('[DB] SQLite driver loaded');
    } catch (e) {
        console.log('[DB] SQLite driver not available:', e);
    }
}

// 数据库操作函数
async function testDBConnection(config: DBConnectionConfig): Promise<{ success: boolean; error?: string }> {
    try {
        if (config.type === 'mysql') {
            if (!mysql2) return { success: false, error: 'MySQL 驱动未安装，请运行: npm install mysql2' };
            const connection = await mysql2.createConnection({
                host: config.host,
                port: config.port,
                user: config.user,
                password: config.password,
                database: config.database,
            });
            await connection.ping();
            await connection.end();
            return { success: true };
        } else if (config.type === 'postgresql') {
            if (!pg) return { success: false, error: 'PostgreSQL 驱动未安装，请运行: npm install pg' };
            const client = new pg.Client({
                host: config.host,
                port: config.port,
                user: config.user,
                password: config.password,
                database: config.database || 'postgres',
            });
            await client.connect();
            await client.end();
            return { success: true };
        } else if (config.type === 'sqlite') {
            if (!betterSqlite3) return { success: false, error: 'SQLite 驱动未安装，请运行: npm install better-sqlite3' };
            if (!config.sqlitePath || !fs.existsSync(config.sqlitePath)) {
                return { success: false, error: '数据库文件不存在' };
            }
            const db = new betterSqlite3(config.sqlitePath, { readonly: true });
            db.close();
            return { success: true };
        }
        return { success: false, error: '不支持的数据库类型' };
    } catch (e: any) {
        return { success: false, error: e.message || String(e) };
    }
}

async function connectDB(config: DBConnectionConfig): Promise<{ success: boolean; connectionId?: string; error?: string }> {
    try {
        const connectionId = `conn_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
        
        if (config.type === 'mysql') {
            if (!mysql2) return { success: false, error: 'MySQL 驱动未安装' };
            const pool = mysql2.createPool({
                host: config.host,
                port: config.port,
                user: config.user,
                password: config.password,
                database: config.database,
                waitForConnections: true,
                connectionLimit: 10,
            });
            dbConnections.set(connectionId, { id: connectionId, config, client: pool });
            return { success: true, connectionId };
        } else if (config.type === 'postgresql') {
            if (!pg) return { success: false, error: 'PostgreSQL 驱动未安装' };
            const pool = new pg.Pool({
                host: config.host,
                port: config.port,
                user: config.user,
                password: config.password,
                database: config.database || 'postgres',
            });
            dbConnections.set(connectionId, { id: connectionId, config, client: pool });
            return { success: true, connectionId };
        } else if (config.type === 'sqlite') {
            if (!betterSqlite3) return { success: false, error: 'SQLite 驱动未安装' };
            const db = new betterSqlite3(config.sqlitePath);
            dbConnections.set(connectionId, { id: connectionId, config, client: db });
            return { success: true, connectionId };
        }
        return { success: false, error: '不支持的数据库类型' };
    } catch (e: any) {
        return { success: false, error: e.message || String(e) };
    }
}

async function disconnectDB(connectionId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const conn = dbConnections.get(connectionId);
        if (!conn) return { success: false, error: '连接不存在' };
        
        if (conn.config.type === 'mysql' || conn.config.type === 'postgresql') {
            await conn.client.end();
        } else if (conn.config.type === 'sqlite') {
            conn.client.close();
        }
        
        dbConnections.delete(connectionId);
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message || String(e) };
    }
}

async function getDatabases(connectionId: string): Promise<{ success: boolean; databases?: string[]; error?: string }> {
    try {
        const conn = dbConnections.get(connectionId);
        if (!conn) return { success: false, error: '连接不存在' };
        
        let databases: string[] = [];
        
        if (conn.config.type === 'mysql') {
            const [rows] = await conn.client.query('SHOW DATABASES');
            databases = rows.map((r: any) => r.Database);
        } else if (conn.config.type === 'postgresql') {
            const result = await conn.client.query("SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname");
            databases = result.rows.map((r: any) => r.datname);
        } else if (conn.config.type === 'sqlite') {
            // SQLite 只有一个数据库
            databases = ['main'];
        }
        
        return { success: true, databases };
    } catch (e: any) {
        return { success: false, error: e.message || String(e) };
    }
}

async function getTables(connectionId: string, database: string): Promise<{ success: boolean; tables?: string[]; error?: string }> {
    try {
        const conn = dbConnections.get(connectionId);
        if (!conn) return { success: false, error: '连接不存在' };
        
        let tables: string[] = [];
        
        if (conn.config.type === 'mysql') {
            const [rows] = await conn.client.query(`SHOW TABLES FROM \`${database}\``);
            tables = rows.map((r: any) => Object.values(r)[0] as string);
        } else if (conn.config.type === 'postgresql') {
            // 切换数据库需要新连接
            const client = new pg.Client({
                host: conn.config.host,
                port: conn.config.port,
                user: conn.config.user,
                password: conn.config.password,
                database: database,
            });
            await client.connect();
            const result = await client.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename");
            tables = result.rows.map((r: any) => r.tablename);
            await client.end();
        } else if (conn.config.type === 'sqlite') {
            const rows = conn.client.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
            tables = rows.map((r: any) => r.name);
        }
        
        return { success: true, tables };
    } catch (e: any) {
        return { success: false, error: e.message || String(e) };
    }
}

async function getTableStructure(connectionId: string, database: string, table: string): Promise<{ success: boolean; columns?: any[]; error?: string }> {
    try {
        const conn = dbConnections.get(connectionId);
        if (!conn) return { success: false, error: '连接不存在' };
        
        let columns: any[] = [];
        
        if (conn.config.type === 'mysql') {
            const [rows] = await conn.client.query(`DESCRIBE \`${database}\`.\`${table}\``);
            columns = rows.map((r: any) => ({
                name: r.Field,
                type: r.Type,
                nullable: r.Null === 'YES',
                key: r.Key,
                default: r.Default,
                extra: r.Extra,
            }));
        } else if (conn.config.type === 'postgresql') {
            const client = new pg.Client({
                host: conn.config.host,
                port: conn.config.port,
                user: conn.config.user,
                password: conn.config.password,
                database: database,
            });
            await client.connect();
            const result = await client.query(`
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_name = $1
                ORDER BY ordinal_position
            `, [table]);
            columns = result.rows.map((r: any) => ({
                name: r.column_name,
                type: r.data_type,
                nullable: r.is_nullable === 'YES',
                key: '',
                default: r.column_default,
                extra: '',
            }));
            await client.end();
        } else if (conn.config.type === 'sqlite') {
            const rows = conn.client.prepare(`PRAGMA table_info("${table}")`).all();
            columns = rows.map((r: any) => ({
                name: r.name,
                type: r.type,
                nullable: r.notnull === 0,
                key: r.pk ? 'PRI' : '',
                default: r.dflt_value,
                extra: '',
            }));
        }
        
        return { success: true, columns };
    } catch (e: any) {
        return { success: false, error: e.message || String(e) };
    }
}

async function getTableData(connectionId: string, database: string, table: string, page: number, pageSize: number): Promise<{ success: boolean; data?: any[]; total?: number; error?: string }> {
    try {
        const conn = dbConnections.get(connectionId);
        if (!conn) return { success: false, error: '连接不存在' };
        
        const offset = (page - 1) * pageSize;
        let data: any[] = [];
        let total = 0;
        
        if (conn.config.type === 'mysql') {
            const [countRows] = await conn.client.query(`SELECT COUNT(*) as count FROM \`${database}\`.\`${table}\``);
            total = countRows[0].count;
            const [rows] = await conn.client.query(`SELECT * FROM \`${database}\`.\`${table}\` LIMIT ${pageSize} OFFSET ${offset}`);
            data = rows;
        } else if (conn.config.type === 'postgresql') {
            const client = new pg.Client({
                host: conn.config.host,
                port: conn.config.port,
                user: conn.config.user,
                password: conn.config.password,
                database: database,
            });
            await client.connect();
            const countResult = await client.query(`SELECT COUNT(*) as count FROM "${table}"`);
            total = parseInt(countResult.rows[0].count);
            const result = await client.query(`SELECT * FROM "${table}" LIMIT $1 OFFSET $2`, [pageSize, offset]);
            data = result.rows;
            await client.end();
        } else if (conn.config.type === 'sqlite') {
            const countRow = conn.client.prepare(`SELECT COUNT(*) as count FROM "${table}"`).get();
            total = countRow.count;
            data = conn.client.prepare(`SELECT * FROM "${table}" LIMIT ? OFFSET ?`).all(pageSize, offset);
        }
        
        return { success: true, data, total };
    } catch (e: any) {
        return { success: false, error: e.message || String(e) };
    }
}

async function executeQuery(connectionId: string, database: string, sql: string): Promise<{ success: boolean; data?: any[]; affectedRows?: number; error?: string }> {
    try {
        const conn = dbConnections.get(connectionId);
        if (!conn) return { success: false, error: '连接不存在' };
        
        // 简单的 SQL 注入防护：禁止某些危险操作
        const upperSql = sql.toUpperCase().trim();
        if (upperSql.includes('DROP DATABASE') || upperSql.includes('DROP SCHEMA')) {
            return { success: false, error: '不允许执行 DROP DATABASE 操作' };
        }
        
        if (conn.config.type === 'mysql') {
            // 先切换数据库
            await conn.client.query(`USE \`${database}\``);
            const [rows, fields] = await conn.client.query(sql);
            if (Array.isArray(rows)) {
                return { success: true, data: rows };
            } else {
                return { success: true, affectedRows: rows.affectedRows };
            }
        } else if (conn.config.type === 'postgresql') {
            const client = new pg.Client({
                host: conn.config.host,
                port: conn.config.port,
                user: conn.config.user,
                password: conn.config.password,
                database: database,
            });
            await client.connect();
            const result = await client.query(sql);
            await client.end();
            if (result.rows) {
                return { success: true, data: result.rows };
            } else {
                return { success: true, affectedRows: result.rowCount || 0 };
            }
        } else if (conn.config.type === 'sqlite') {
            if (upperSql.startsWith('SELECT')) {
                const rows = conn.client.prepare(sql).all();
                return { success: true, data: rows };
            } else {
                const info = conn.client.prepare(sql).run();
                return { success: true, affectedRows: info.changes };
            }
        }
        
        return { success: false, error: '不支持的数据库类型' };
    } catch (e: any) {
        return { success: false, error: e.message || String(e) };
    }
}

// ==================== Redis 连接管理 ====================

interface RedisConnectionConfig {
    id?: string;
    name: string;
    host: string;
    port: number;
    password?: string;
    database: number;
    tls?: boolean;
}

interface RedisConnection {
    id: string;
    config: RedisConnectionConfig;
    client: any;
}

const redisConnections: Map<string, RedisConnection> = new Map();

let ioredis: any = null;

async function loadRedisDriver() {
    try {
        ioredis = (await import('ioredis')).default;
        console.log('[Redis] ioredis driver loaded');
    } catch (e) {
        console.log('[Redis] ioredis driver not available:', e);
    }
}

async function testRedisConnection(config: RedisConnectionConfig): Promise<{ success: boolean; error?: string }> {
    if (!ioredis) return { success: false, error: 'Redis 驱动未安装，请运行: npm install ioredis' };
    
    return new Promise((resolve) => {
        const client = new ioredis({
            host: config.host,
            port: config.port,
            password: config.password || undefined,
            db: config.database,
            tls: config.tls ? {} : undefined,
            connectTimeout: 10000,
            maxRetriesPerRequest: 1,
            retryStrategy: () => null, // 不重试
        });
        
        const timeout = setTimeout(() => {
            client.disconnect();
            resolve({ success: false, error: '连接超时' });
        }, 12000);
        
        client.on('error', (err: Error) => {
            clearTimeout(timeout);
            client.disconnect();
            resolve({ success: false, error: err.message });
        });
        
        client.ping().then(() => {
            clearTimeout(timeout);
            client.quit();
            resolve({ success: true });
        }).catch((err: Error) => {
            clearTimeout(timeout);
            client.disconnect();
            resolve({ success: false, error: err.message });
        });
    });
}

async function connectRedis(config: RedisConnectionConfig): Promise<{ success: boolean; connectionId?: string; error?: string }> {
    if (!ioredis) return { success: false, error: 'Redis 驱动未安装' };
    
    return new Promise((resolve) => {
        const connectionId = `redis_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
        const client = new ioredis({
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
            resolve({ success: false, error: '连接超时' });
        }, 15000);
        
        client.on('error', (err: Error) => {
            console.error('[Redis] Connection error:', err.message);
        });
        
        client.on('ready', () => {
            clearTimeout(timeout);
            redisConnections.set(connectionId, { id: connectionId, config, client });
            resolve({ success: true, connectionId });
        });
        
        // 首次连接失败
        client.once('error', (err: Error) => {
            if (!redisConnections.has(connectionId)) {
                clearTimeout(timeout);
                client.disconnect();
                resolve({ success: false, error: err.message });
            }
        });
    });
}

async function disconnectRedis(connectionId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const conn = redisConnections.get(connectionId);
        if (!conn) return { success: false, error: '连接不存在' };
        await conn.client.quit();
        redisConnections.delete(connectionId);
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message || String(e) };
    }
}

async function redisSelectDB(connectionId: string, db: number): Promise<{ success: boolean; error?: string }> {
    try {
        const conn = redisConnections.get(connectionId);
        if (!conn) return { success: false, error: '连接不存在' };
        await conn.client.select(db);
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message || String(e) };
    }
}

async function redisScan(connectionId: string, cursor: string, pattern: string, count: number): Promise<{ success: boolean; cursor?: string; keys?: string[]; error?: string }> {
    try {
        const conn = redisConnections.get(connectionId);
        if (!conn) return { success: false, error: '连接不存在' };
        const [newCursor, keys] = await conn.client.scan(cursor, 'MATCH', pattern, 'COUNT', count);
        return { success: true, cursor: newCursor, keys };
    } catch (e: any) {
        return { success: false, error: e.message || String(e) };
    }
}

async function redisGetType(connectionId: string, key: string): Promise<{ success: boolean; type?: string; error?: string }> {
    try {
        const conn = redisConnections.get(connectionId);
        if (!conn) return { success: false, error: '连接不存在' };
        const type = await conn.client.type(key);
        return { success: true, type };
    } catch (e: any) {
        return { success: false, error: e.message || String(e) };
    }
}

async function redisGetTTL(connectionId: string, key: string): Promise<{ success: boolean; ttl?: number; error?: string }> {
    try {
        const conn = redisConnections.get(connectionId);
        if (!conn) return { success: false, error: '连接不存在' };
        const ttl = await conn.client.ttl(key);
        return { success: true, ttl };
    } catch (e: any) {
        return { success: false, error: e.message || String(e) };
    }
}

async function redisSetTTL(connectionId: string, key: string, ttl: number): Promise<{ success: boolean; error?: string }> {
    try {
        const conn = redisConnections.get(connectionId);
        if (!conn) return { success: false, error: '连接不存在' };
        if (ttl === -1) await conn.client.persist(key);
        else await conn.client.expire(key, ttl);
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message || String(e) };
    }
}

async function redisDeleteKey(connectionId: string, key: string): Promise<{ success: boolean; error?: string }> {
    try {
        const conn = redisConnections.get(connectionId);
        if (!conn) return { success: false, error: '连接不存在' };
        await conn.client.del(key);
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message || String(e) };
    }
}

async function redisRenameKey(connectionId: string, oldKey: string, newKey: string): Promise<{ success: boolean; error?: string }> {
    try {
        const conn = redisConnections.get(connectionId);
        if (!conn) return { success: false, error: '连接不存在' };
        await conn.client.rename(oldKey, newKey);
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message || String(e) };
    }
}

async function redisGetString(connectionId: string, key: string): Promise<{ success: boolean; value?: string; error?: string }> {
    try {
        const conn = redisConnections.get(connectionId);
        if (!conn) return { success: false, error: '连接不存在' };
        const value = await conn.client.get(key);
        return { success: true, value: value || '' };
    } catch (e: any) {
        return { success: false, error: e.message || String(e) };
    }
}

async function redisSetString(connectionId: string, key: string, value: string, ttl?: number): Promise<{ success: boolean; error?: string }> {
    try {
        const conn = redisConnections.get(connectionId);
        if (!conn) return { success: false, error: '连接不存在' };
        if (ttl && ttl > 0) await conn.client.setex(key, ttl, value);
        else await conn.client.set(key, value);
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message || String(e) };
    }
}

async function redisGetHash(connectionId: string, key: string): Promise<{ success: boolean; value?: Record<string, string>; error?: string }> {
    try {
        const conn = redisConnections.get(connectionId);
        if (!conn) return { success: false, error: '连接不存在' };
        const value = await conn.client.hgetall(key);
        return { success: true, value: value || {} };
    } catch (e: any) {
        return { success: false, error: e.message || String(e) };
    }
}

async function redisSetHashField(connectionId: string, key: string, field: string, value: string): Promise<{ success: boolean; error?: string }> {
    try {
        const conn = redisConnections.get(connectionId);
        if (!conn) return { success: false, error: '连接不存在' };
        await conn.client.hset(key, field, value);
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message || String(e) };
    }
}

async function redisDeleteHashField(connectionId: string, key: string, field: string): Promise<{ success: boolean; error?: string }> {
    try {
        const conn = redisConnections.get(connectionId);
        if (!conn) return { success: false, error: '连接不存在' };
        await conn.client.hdel(key, field);
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message || String(e) };
    }
}

async function redisGetList(connectionId: string, key: string, start: number, stop: number): Promise<{ success: boolean; value?: string[]; total?: number; error?: string }> {
    try {
        const conn = redisConnections.get(connectionId);
        if (!conn) return { success: false, error: '连接不存在' };
        const [value, total] = await Promise.all([
            conn.client.lrange(key, start, stop),
            conn.client.llen(key),
        ]);
        return { success: true, value, total };
    } catch (e: any) {
        return { success: false, error: e.message || String(e) };
    }
}

async function redisPushList(connectionId: string, key: string, value: string, position: 'left' | 'right'): Promise<{ success: boolean; error?: string }> {
    try {
        const conn = redisConnections.get(connectionId);
        if (!conn) return { success: false, error: '连接不存在' };
        if (position === 'left') await conn.client.lpush(key, value);
        else await conn.client.rpush(key, value);
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message || String(e) };
    }
}

async function redisDeleteListItem(connectionId: string, key: string, index: number, count: number): Promise<{ success: boolean; error?: string }> {
    try {
        const conn = redisConnections.get(connectionId);
        if (!conn) return { success: false, error: '连接不存在' };
        // Redis 没有直接删除索引的命令，使用 LSET + LREM 模式
        const placeholder = `__DELETED_${Date.now()}__`;
        await conn.client.lset(key, index, placeholder);
        await conn.client.lrem(key, count, placeholder);
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message || String(e) };
    }
}

async function redisGetSet(connectionId: string, key: string): Promise<{ success: boolean; value?: string[]; error?: string }> {
    try {
        const conn = redisConnections.get(connectionId);
        if (!conn) return { success: false, error: '连接不存在' };
        const value = await conn.client.smembers(key);
        return { success: true, value };
    } catch (e: any) {
        return { success: false, error: e.message || String(e) };
    }
}

async function redisAddSetMember(connectionId: string, key: string, member: string): Promise<{ success: boolean; error?: string }> {
    try {
        const conn = redisConnections.get(connectionId);
        if (!conn) return { success: false, error: '连接不存在' };
        await conn.client.sadd(key, member);
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message || String(e) };
    }
}

async function redisRemoveSetMember(connectionId: string, key: string, member: string): Promise<{ success: boolean; error?: string }> {
    try {
        const conn = redisConnections.get(connectionId);
        if (!conn) return { success: false, error: '连接不存在' };
        await conn.client.srem(key, member);
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message || String(e) };
    }
}

async function redisGetZSet(connectionId: string, key: string, withScores: boolean): Promise<{ success: boolean; value?: Array<{ member: string; score: number }>; total?: number; error?: string }> {
    try {
        const conn = redisConnections.get(connectionId);
        if (!conn) return { success: false, error: '连接不存在' };
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
    } catch (e: any) {
        return { success: false, error: e.message || String(e) };
    }
}

async function redisAddZSetMember(connectionId: string, key: string, member: string, score: number): Promise<{ success: boolean; error?: string }> {
    try {
        const conn = redisConnections.get(connectionId);
        if (!conn) return { success: false, error: '连接不存在' };
        await conn.client.zadd(key, score, member);
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message || String(e) };
    }
}

async function redisRemoveZSetMember(connectionId: string, key: string, member: string): Promise<{ success: boolean; error?: string }> {
    try {
        const conn = redisConnections.get(connectionId);
        if (!conn) return { success: false, error: '连接不存在' };
        await conn.client.zrem(key, member);
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message || String(e) };
    }
}

async function redisExecuteCommand(connectionId: string, command: string): Promise<{ success: boolean; result?: any; error?: string }> {
    try {
        const conn = redisConnections.get(connectionId);
        if (!conn) return { success: false, error: '连接不存在' };
        // 解析命令
        const parts = command.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
        const cmd = parts[0]?.toUpperCase();
        const args = parts.slice(1).map(arg => arg.replace(/^"|"$/g, ''));
        
        if (!cmd) return { success: false, error: '无效命令' };
        
        const result = await conn.client.call(cmd, ...args);
        return { success: true, result };
    } catch (e: any) {
        return { success: false, error: e.message || String(e) };
    }
}

async function redisDBSize(connectionId: string): Promise<{ success: boolean; size?: number; error?: string }> {
    try {
        const conn = redisConnections.get(connectionId);
        if (!conn) return { success: false, error: '连接不存在' };
        const size = await conn.client.dbsize();
        return { success: true, size };
    } catch (e: any) {
        return { success: false, error: e.message || String(e) };
    }
}

// 注册 Redis IPC 处理器
function setupRedisHandlers() {
    ipcMain.handle('redis:test-connection', async (_e, config: RedisConnectionConfig) => testRedisConnection(config));
    ipcMain.handle('redis:connect', async (_e, config: RedisConnectionConfig) => connectRedis(config));
    ipcMain.handle('redis:disconnect', async (_e, connectionId: string) => disconnectRedis(connectionId));
    ipcMain.handle('redis:select-db', async (_e, connectionId: string, db: number) => redisSelectDB(connectionId, db));
    ipcMain.handle('redis:scan', async (_e, connectionId: string, cursor: string, pattern: string, count: number) => redisScan(connectionId, cursor, pattern, count));
    ipcMain.handle('redis:get-type', async (_e, connectionId: string, key: string) => redisGetType(connectionId, key));
    ipcMain.handle('redis:get-ttl', async (_e, connectionId: string, key: string) => redisGetTTL(connectionId, key));
    ipcMain.handle('redis:set-ttl', async (_e, connectionId: string, key: string, ttl: number) => redisSetTTL(connectionId, key, ttl));
    ipcMain.handle('redis:delete-key', async (_e, connectionId: string, key: string) => redisDeleteKey(connectionId, key));
    ipcMain.handle('redis:rename-key', async (_e, connectionId: string, oldKey: string, newKey: string) => redisRenameKey(connectionId, oldKey, newKey));
    ipcMain.handle('redis:get-string', async (_e, connectionId: string, key: string) => redisGetString(connectionId, key));
    ipcMain.handle('redis:set-string', async (_e, connectionId: string, key: string, value: string, ttl?: number) => redisSetString(connectionId, key, value, ttl));
    ipcMain.handle('redis:get-hash', async (_e, connectionId: string, key: string) => redisGetHash(connectionId, key));
    ipcMain.handle('redis:set-hash-field', async (_e, connectionId: string, key: string, field: string, value: string) => redisSetHashField(connectionId, key, field, value));
    ipcMain.handle('redis:delete-hash-field', async (_e, connectionId: string, key: string, field: string) => redisDeleteHashField(connectionId, key, field));
    ipcMain.handle('redis:get-list', async (_e, connectionId: string, key: string, start: number, stop: number) => redisGetList(connectionId, key, start, stop));
    ipcMain.handle('redis:push-list', async (_e, connectionId: string, key: string, value: string, position: 'left' | 'right') => redisPushList(connectionId, key, value, position));
    ipcMain.handle('redis:delete-list-item', async (_e, connectionId: string, key: string, index: number, count: number) => redisDeleteListItem(connectionId, key, index, count));
    ipcMain.handle('redis:get-set', async (_e, connectionId: string, key: string) => redisGetSet(connectionId, key));
    ipcMain.handle('redis:add-set-member', async (_e, connectionId: string, key: string, member: string) => redisAddSetMember(connectionId, key, member));
    ipcMain.handle('redis:remove-set-member', async (_e, connectionId: string, key: string, member: string) => redisRemoveSetMember(connectionId, key, member));
    ipcMain.handle('redis:get-zset', async (_e, connectionId: string, key: string, withScores: boolean) => redisGetZSet(connectionId, key, withScores));
    ipcMain.handle('redis:add-zset-member', async (_e, connectionId: string, key: string, member: string, score: number) => redisAddZSetMember(connectionId, key, member, score));
    ipcMain.handle('redis:remove-zset-member', async (_e, connectionId: string, key: string, member: string) => redisRemoveZSetMember(connectionId, key, member));
    ipcMain.handle('redis:execute-command', async (_e, connectionId: string, command: string) => redisExecuteCommand(connectionId, command));
    ipcMain.handle('redis:db-size', async (_e, connectionId: string) => redisDBSize(connectionId));
}

// 注册数据库 IPC 处理器
function setupDBHandlers() {
    ipcMain.handle('db:test-connection', async (_e, config: DBConnectionConfig) => {
        return testDBConnection(config);
    });
    
    ipcMain.handle('db:connect', async (_e, config: DBConnectionConfig) => {
        return connectDB(config);
    });
    
    ipcMain.handle('db:disconnect', async (_e, connectionId: string) => {
        return disconnectDB(connectionId);
    });
    
    ipcMain.handle('db:get-databases', async (_e, connectionId: string) => {
        return getDatabases(connectionId);
    });
    
    ipcMain.handle('db:get-tables', async (_e, connectionId: string, database: string) => {
        return getTables(connectionId, database);
    });
    
    ipcMain.handle('db:get-table-structure', async (_e, connectionId: string, database: string, table: string) => {
        return getTableStructure(connectionId, database, table);
    });
    
    ipcMain.handle('db:get-table-data', async (_e, connectionId: string, database: string, table: string, page: number, pageSize: number) => {
        return getTableData(connectionId, database, table, page, pageSize);
    });
    
    ipcMain.handle('db:execute-query', async (_e, connectionId: string, database: string, sql: string) => {
        return executeQuery(connectionId, database, sql);
    });
    
    ipcMain.handle('db:update-record', async (_e, connectionId: string, database: string, table: string, primaryKey: string, primaryValue: any, column: string, value: any) => {
        // 简化实现
        const sql = `UPDATE "${table}" SET "${column}" = '${value}' WHERE "${primaryKey}" = '${primaryValue}'`;
        return executeQuery(connectionId, database, sql);
    });
}

interface SiteDef { key: string; title: string; url: string; partition?: string; ua?: string }

interface PersistShape { lastSite?: string; windowBounds?: { width: number; height: number } }
const store = new Store<PersistShape>();

const sites: SiteDef[] = [
    { key: 'openai', title: 'OpenAI ChatGPT', url: 'https://chat.openai.com', partition: 'persist:openai' },
    { key: 'lmarena', title: 'LMArena', url: 'https://lmarena.ai/', partition: 'persist:lmarena' },
    { key: 'gemini', title: 'Google Gemini', url: 'https://gemini.google.com', partition: 'persist:gemini' },
    { key: 'deepseek', title: 'DeepSeek', url: 'https://chat.deepseek.com', partition: 'persist:deepseek' },
    { key: 'kimi', title: 'Kimi (Moonshot)', url: 'https://kimi.moonshot.cn', partition: 'persist:kimi' },
    { key: 'grok', title: 'Grok (xAI)', url: 'https://grok.com', partition: 'persist:grok' },
];

let mainWindow: BrowserWindow | null = null;

// 允许被 iframe 嵌入的站点域名列表（仅对这些域名做 header 调整）
const FRAME_BYPASS_HOSTS = [
    'chat.deepseek.com',
    'auth.openai.com',
    'ab.chatgpt.com',
    'chat.openai.com',
    'chatgpt.com',
    'gemini.google.com',
    'accounts.google.com', // Gemini 登录/刷新Cookie流程
    'aistudio.google.com', // Google AI Studio
    'alkalimakersuite-pa.clients6.google.com', // AI Studio API
    'makersuite.google.com', // AI Studio 旧域名
    'generativelanguage.googleapis.com', // Gemini API
    'kimi.moonshot.cn',
    'grok.com',
    'accounts.x.ai', // Grok 登录重定向域
    'lmarena.ai' // LM Arena 排行榜
];

// 按域自定义 UA（用户需求：GPT / Grok）。可按需再扩展。
const UA_MAP: Record<string, string> = {
    'chat.openai.com': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'auth.openai.com': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'chatgpt.com': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'aistudio.google.com': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'accounts.google.com': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'alkalimakersuite-pa.clients6.google.com': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'makersuite.google.com': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'grok.com': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'lmarena.ai': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
};

function installFrameBypass() {
    const ses = session.defaultSession; // BrowserWindow (及其中 iframe) 使用的默认 session
    // 去掉 X-Frame-Options，并移除 CSP 中的 frame-ancestors 限制
    ses.webRequest.onHeadersReceived((details, callback) => {
        try {
            const urlHost = new URL(details.url).host;
            if (!FRAME_BYPASS_HOSTS.includes(urlHost)) {
                return callback({ responseHeaders: details.responseHeaders });
            }
            const newHeaders: Record<string, string | string[]> = {};
            // 复制并规范化（过滤掉 undefined）
            for (const [k, v] of Object.entries(details.responseHeaders || {})) {
                if (Array.isArray(v)) newHeaders[k] = v; else if (typeof v === 'string') newHeaders[k] = v;
            }
            // 删除 X-Frame-Options
            for (const key of Object.keys(newHeaders)) {
                if (key.toLowerCase() === 'x-frame-options') {
                    delete newHeaders[key];
                }
            }
            // 处理 CSP
            for (const key of Object.keys(newHeaders)) {
                if (key.toLowerCase() === 'content-security-policy') {
                    const val = newHeaders[key];
                    const arr = Array.isArray(val) ? val : [val];
                    const modified = arr.map(pol => pol
                        .split(';')
                        .filter(seg => !seg.trim().toLowerCase().startsWith('frame-ancestors'))
                        .join(';'));
                    newHeaders[key] = modified;
                }
            }
            callback({
                responseHeaders: newHeaders,
                statusLine: details.statusLine
            });
        } catch (e) {
            callback({ responseHeaders: details.responseHeaders });
        }
    });

    // 可选：拦截 frame busting（简单替换常见 window.top !== window.self 跳出脚本）
    // 复杂脚本很难完全规避，这里只做最小示例，如需更强策略需构建反向代理。
    // ses.webRequest.onBeforeRequest({ urls: FRAME_BYPASS_HOSTS.map(h => `*://${h}/*`) }, (details, callback) => {
    //     callback({ cancel: false });
    // });

    // 设置按域 User-Agent（只针对主框架与子框架 document 请求）
    ses.webRequest.onBeforeSendHeaders((details, callback) => {
        try {
            const host = new URL(details.url).host;
            if (UA_MAP[host] && (details.resourceType === 'mainFrame' || details.resourceType === 'subFrame')) {
                details.requestHeaders['User-Agent'] = UA_MAP[host];
            }

            // 为LMArena添加额外的请求头来避免403错误
            if (host === 'lmarena.ai') {
                details.requestHeaders['Accept'] = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8';
                details.requestHeaders['Accept-Language'] = 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7';
                details.requestHeaders['Accept-Encoding'] = 'gzip, deflate, br';
                details.requestHeaders['Cache-Control'] = 'no-cache';
                details.requestHeaders['Pragma'] = 'no-cache';
                details.requestHeaders['Upgrade-Insecure-Requests'] = '1';
                details.requestHeaders['Sec-Fetch-Dest'] = 'document';
                details.requestHeaders['Sec-Fetch-Mode'] = 'navigate';
                details.requestHeaders['Sec-Fetch-Site'] = 'none';
                details.requestHeaders['Sec-Fetch-User'] = '?1';
            }

            // 为 Google AI Studio 添加额外请求头，避免跳转检测
            if (host === 'aistudio.google.com' || host === 'accounts.google.com' || host.endsWith('.google.com')) {
                details.requestHeaders['Accept'] = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8';
                details.requestHeaders['Accept-Language'] = 'en-US,en;q=0.9';
                details.requestHeaders['Accept-Encoding'] = 'gzip, deflate, br';
                details.requestHeaders['Upgrade-Insecure-Requests'] = '1';
                details.requestHeaders['Sec-Ch-Ua'] = '"Google Chrome";v="125", "Chromium";v="125", "Not.A/Brand";v="24"';
                details.requestHeaders['Sec-Ch-Ua-Mobile'] = '?0';
                details.requestHeaders['Sec-Ch-Ua-Platform'] = '"macOS"';
                details.requestHeaders['Sec-Fetch-Dest'] = 'document';
                details.requestHeaders['Sec-Fetch-Mode'] = 'navigate';
                details.requestHeaders['Sec-Fetch-Site'] = 'none';
                details.requestHeaders['Sec-Fetch-User'] = '?1';
            }
        } catch { /* ignore */ }
        callback({ requestHeaders: details.requestHeaders });
    });
}

function installPermissions() {
    const trustedHosts = new Set<string>([
        'chat.openai.com', 'auth.openai.com', 'chatgpt.com', 'ab.chatgpt.com',
        'gemini.google.com', 'accounts.google.com',
        'aistudio.google.com', 'alkalimakersuite-pa.clients6.google.com', 'makersuite.google.com',
        'chat.deepseek.com', 'kimi.moonshot.cn',
        'grok.com', 'accounts.x.ai',
        'lmarena.ai'
    ]);
    const allowPerms = new Set<Parameters<Electron.Session['setPermissionRequestHandler']>[0] extends (a: any, b: infer P, ...rest: any) => any ? P : string>([
        'clipboard-read',
        // 一些站点可能使用剪贴板写入的变体权限；若无效会被忽略
        'clipboard-sanitized-write',
        // 可按需放开以下常见权限（如需语音/屏幕分享/定位）
        'media', 'display-capture', 'geolocation'
    ] as any);

    const sessions: Electron.Session[] = [
        session.defaultSession,
        session.fromPartition('persist:openai'),
        session.fromPartition('persist:lmarena'),
        session.fromPartition('persist:gemini'),
        session.fromPartition('persist:deepseek'),
        session.fromPartition('persist:kimi'),
        session.fromPartition('persist:grok')
    ];

    for (const ses of sessions) {
        try {
            ses.setPermissionCheckHandler((_wc, permission, requestingOrigin) => {
                try {
                    const host = requestingOrigin ? new URL(requestingOrigin).host : '';
                    return allowPerms.has(permission as any) && trustedHosts.has(host);
                } catch { return false; }
            });
            ses.setPermissionRequestHandler((_wc, permission, callback, details) => {
                try {
                    const host = details?.requestingUrl ? new URL(details.requestingUrl).host : '';
                    const allow = allowPerms.has(permission as any) && trustedHosts.has(host);
                    callback(allow);
                } catch {
                    callback(false);
                }
            });
        } catch { /* ignore */ }
    }
}

function createWindow(initialSite?: string) {
    const workArea = screen.getPrimaryDisplay().workAreaSize;
    // 默认使用工作区 70% 尺寸（用户要求比之前稍宽稍高）
    const targetW = Math.max(400, Math.round(workArea.width * 0.7));
    const targetH = Math.max(320, Math.round(workArea.height * 0.7));
    // 忽略之前持久化宽度（仍会记录后续调整）
    mainWindow = new BrowserWindow({
        width: targetW,
        height: targetH,
        title: 'ToolHub Shell',
        minWidth: 400,
        minHeight: 320,
        // 恢复黑色不透明主题
        backgroundColor: '#000000',
        frame: true, // 恢复原生标题栏，避免高度错觉
        // 添加图标配置，根据平台自动选择正确格式
        icon: path.join(__dirname, '../assets/icons/icon.icns'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            webviewTag: true, // 允许 renderer 使用 <webview>
            webSecurity: true, // 保持Web安全策略
            // 确保webview有足够的权限和性能配置
            additionalArguments: [
                '--enable-features=OverlayScrollbar,OverlayScrollbarFlashAfterAnyScrollUpdate,OverlayScrollbarFlashWhenMouseEnter',
                '--disable-features=VizDisplayCompositor', // 可能有助于webview显示
                '--enable-gpu-rasterization',
                '--enable-zero-copy'
            ]
        },
        show: false // 先不显示，等加载完成后再显示
    });

    mainWindow.on('resize', () => {
        if (!mainWindow) return;
        const b = mainWindow.getBounds();
        (store as any).set?.('windowBounds', { width: b.width, height: b.height });
    });

    // 设置窗口背景为黑色
    mainWindow.setBackgroundColor('#000000');

    buildMenu();
    mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

    // 当页面加载完成时显示窗口
    mainWindow.webContents.once('did-finish-load', () => {
        mainWindow?.show(); // 现在显示窗口
        mainWindow?.webContents.send('init-data', { sites, lastSite: initialSite });
    });
    ipcMain.on('persist-last-site', (_e, key: string) => {
        (store as any).set?.('lastSite', key);
    });
    ipcMain.on('clear-active-partition', async (_e, partition: string) => {
        try {
            const ses = session.fromPartition(partition);
            await ses.clearStorageData();
            dialog.showMessageBox({ message: `已清理 ${partition} 数据` });
        } catch (err) {
            dialog.showErrorBox('清理失败', String(err));
        }
    });
}

// Retain loadSite for menu fallback: open external site in separate BrowserWindow
function loadSite(site: SiteDef) {
    const child = new BrowserWindow({
        width: 1280,
        height: 860,
        title: site.title,
        webPreferences: {
            partition: site.partition || `persist:${site.key}`,
            nodeIntegration: false,
            contextIsolation: true,
        }
    });
    const partition = site.partition || `persist:${site.key}`;
    const ses = session.fromPartition(partition, { cache: true });
    if (site.ua) ses.setUserAgent(site.ua);
    child.loadURL(site.url).catch(err => dialog.showErrorBox('Load Failed', `${site.title}: ${err}`));
}

function buildMenu() {
    const template: MenuItemConstructorOptions[] = [
        {
            label: 'App',
            submenu: [
                { label: 'Reload Window', accelerator: 'CmdOrCtrl+R', click: () => mainWindow?.reload() },
                {
                    label: 'Half Height Now', click: () => {
                        if (!mainWindow) return;
                        const b = mainWindow.getBounds();
                        const workH = screen.getPrimaryDisplay().workAreaSize.height;
                        const newH = Math.max(320, Math.round(workH / 2));
                        mainWindow.setBounds({ ...b, height: newH });
                    }
                },
                { label: 'Toggle DevTools', accelerator: 'Alt+CmdOrCtrl+I', click: () => mainWindow?.webContents.openDevTools() },
                { type: 'separator' },
                { label: 'Quit', role: 'quit' }
            ]
        },
        // 标准编辑菜单，确保在 macOS 上 Cmd+C/V/X 等快捷键与 webview/iframe 一起工作
        { role: 'editMenu' as any },
        {
            label: 'Site',
            submenu: [
                { label: 'Clear Current Site Data', click: () => mainWindow?.webContents.send('nav', { action: 'clear-data' }) },
                { label: 'Open Active in Browser', click: () => { const url = mainWindow?.webContents.getURL(); if (url) shell.openExternal(url); } }
            ]
        }
    ];
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// 为所有 WebContents（窗口与 webview）提供右键复制/粘贴菜单
function installContextMenu() {
    app.on('web-contents-created', (_e, contents) => {
        contents.on('context-menu', (event, params) => {
            const template: MenuItemConstructorOptions[] = [];
            const hasText = !!params.selectionText?.trim();
            const isEditable = !!params.isEditable;
            if (isEditable) template.push({ role: 'cut' });
            if (hasText) template.push({ role: 'copy' });
            if (isEditable) template.push({ role: 'paste' });
            if (template.length) template.push({ type: 'separator' });
            template.push({ role: 'selectAll' });
            const menu = Menu.buildFromTemplate(template);
            const win = BrowserWindow.fromWebContents(contents);
            menu.popup({ window: win ?? undefined });
        });
    });
}

app.whenReady().then(async () => {
    // 加载数据库驱动
    await loadDBDrivers();
    setupDBHandlers();
    
    // 加载 Redis 驱动
    await loadRedisDriver();
    setupRedisHandlers();
    
    installFrameBypass();
    installPermissions();
    installContextMenu();
    createWindow((store as any).get?.('lastSite'));
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow((store as any).get?.('lastSite'));
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

ipcMain.on('open-external', (_e, url: string) => {
    if (url) shell.openExternal(url);
});

// 保存文件对话框
ipcMain.handle('save-file', async (_e, options: { defaultName: string; filters: { name: string; extensions: string[] }[]; data: string }) => {
    const result = await dialog.showSaveDialog({
        defaultPath: options.defaultName,
        filters: options.filters,
    });
    
    if (result.canceled || !result.filePath) {
        return { success: false, canceled: true };
    }
    
    try {
        // data 是 base64 编码的图片数据
        const base64Data = options.data.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        fs.writeFileSync(result.filePath, buffer);
        return { success: true, filePath: result.filePath };
    } catch (err) {
        return { success: false, error: String(err) };
    }
});

// 打开站点独立窗口（为需要顶层环境的站点提供登录/完整功能）
ipcMain.on('open-site-window', (_e, key: string) => {
    const site = sites.find(s => s.key === key);
    if (!site) return;
    const part = site.partition || `persist:${site.key}`;
    const win = new BrowserWindow({
        width: 1280,
        height: 860,
        title: site.title,
        webPreferences: {
            partition: part,
            nodeIntegration: false,
            contextIsolation: true,
        }
    });
    win.loadURL(site.url).catch(err => dialog.showErrorBox('Open Site Failed', String(err)));
});

// 打开顶层登录窗口（与 iframe 共用 partition）
ipcMain.on('open-top-login', (e, key: string) => {
    const site = sites.find(s => s.key === key);
    if (!site) return;
    const part = site.partition || `persist:${site.key}`;
    const win = new BrowserWindow({
        width: 900,
        height: 720,
        title: `Login - ${site.title}`,
        webPreferences: {
            partition: part,
            nodeIntegration: false,
            contextIsolation: true,
        }
    });
    win.loadURL(site.url).catch(err => dialog.showErrorBox('Login Window Load Failed', String(err)));
    win.on('closed', () => {
        // 通知渲染进程刷新该站点 iframe/webview
        mainWindow?.webContents.send('top-login-done', site.key);
    });
});
