/**
 * 数据库管理模块
 * 负责 MySQL、PostgreSQL、SQLite 的连接管理和操作
 */

import fs from 'node:fs';
import { 
    validateSQL, 
    validateIdentifiers, 
    buildUpdateStatement,
    checkQueryLimit 
} from './sql-validator.js';
import type { 
    DBClient, 
    DBDrivers, 
    MySQLDriver, 
    PostgreSQLDriver, 
    SQLiteDriver,
    DBQueryResult,
    TableStructureResult,
    ColumnInfo,
    DatabaseRow,
    MySQLQueryResult
} from './types.js';
import { getErrorMessage } from '../utils/error-handler.js';

// ==================== 类型定义 ====================

export interface DBConnectionConfig {
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

export interface DBConnection {
    id: string;
    config: DBConnectionConfig;
    client: DBClient;
}

// ==================== 数据库管理器类 ====================

export class DatabaseManager {
    private connections: Map<string, DBConnection> = new Map();
    private drivers: DBDrivers = {
        mysql2: null,
        pg: null,
        betterSqlite3: null,
    };

    /**
     * 加载数据库驱动
     */
    async loadDrivers(): Promise<void> {
        try {
            this.drivers.mysql2 = await import('mysql2/promise') as MySQLDriver;
            console.log('[DB] MySQL driver loaded');
        } catch (e) {
            console.log('[DB] MySQL driver not available:', e);
        }
        
        try {
            this.drivers.pg = await import('pg') as PostgreSQLDriver;
            console.log('[DB] PostgreSQL driver loaded');
        } catch (e) {
            console.log('[DB] PostgreSQL driver not available:', e);
        }
        
        try {
            const sqlite = await import('better-sqlite3');
            this.drivers.betterSqlite3 = sqlite.default as SQLiteDriver;
            console.log('[DB] SQLite driver loaded');
        } catch (e) {
            console.log('[DB] SQLite driver not available:', e);
        }
    }

    /**
     * 测试数据库连接
     */
    async testConnection(config: DBConnectionConfig): Promise<{ success: boolean; error?: string }> {
        try {
            if (config.type === 'mysql') {
                if (!this.drivers.mysql2) {
                    return { success: false, error: 'MySQL 驱动未安装，请运行: npm install mysql2' };
                }
                const connection = await this.drivers.mysql2.createConnection({
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
                if (!this.drivers.pg) {
                    return { success: false, error: 'PostgreSQL 驱动未安装，请运行: npm install pg' };
                }
                const client = new this.drivers.pg.Client({
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
                if (!this.drivers.betterSqlite3) {
                    return { success: false, error: 'SQLite 驱动未安装，请运行: npm install better-sqlite3' };
                }
                if (!config.sqlitePath || !fs.existsSync(config.sqlitePath)) {
                    return { success: false, error: '数据库文件不存在' };
                }
                const db = new this.drivers.betterSqlite3(config.sqlitePath, { readonly: true });
                db.close();
                return { success: true };
            }
            return { success: false, error: '不支持的数据库类型' };
        } catch (e: unknown) {
            return { success: false, error: getErrorMessage(e) };
        }
    }

    /**
     * 连接数据库
     */
    async connect(config: DBConnectionConfig): Promise<{ success: boolean; connectionId?: string; error?: string }> {
        try {
            const connectionId = `conn_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
            
            if (config.type === 'mysql') {
                if (!this.drivers.mysql2) {
                    return { success: false, error: 'MySQL 驱动未安装' };
                }
                const pool = this.drivers.mysql2.createPool({
                    host: config.host,
                    port: config.port,
                    user: config.user,
                    password: config.password,
                    database: config.database,
                    waitForConnections: true,
                    connectionLimit: 10,
                });
                this.connections.set(connectionId, { id: connectionId, config, client: pool });
                return { success: true, connectionId };
            } else if (config.type === 'postgresql') {
                if (!this.drivers.pg) {
                    return { success: false, error: 'PostgreSQL 驱动未安装' };
                }
                const pool = new this.drivers.pg.Pool({
                    host: config.host,
                    port: config.port,
                    user: config.user,
                    password: config.password,
                    database: config.database || 'postgres',
                });
                this.connections.set(connectionId, { id: connectionId, config, client: pool });
                return { success: true, connectionId };
            } else if (config.type === 'sqlite') {
                if (!this.drivers.betterSqlite3) {
                    return { success: false, error: 'SQLite 驱动未安装' };
                }
                const db = new this.drivers.betterSqlite3(config.sqlitePath);
                this.connections.set(connectionId, { id: connectionId, config, client: db });
                return { success: true, connectionId };
            }
            return { success: false, error: '不支持的数据库类型' };
        } catch (e: unknown) {
            return { success: false, error: getErrorMessage(e) };
        }
    }

    /**
     * 断开数据库连接
     */
    async disconnect(connectionId: string): Promise<{ success: boolean; error?: string }> {
        try {
            const conn = this.connections.get(connectionId);
            if (!conn) {
                return { success: false, error: '连接不存在' };
            }
            
            if (conn.config.type === 'mysql' || conn.config.type === 'postgresql') {
                await conn.client.end();
            } else if (conn.config.type === 'sqlite') {
                conn.client.close();
            }
            
            this.connections.delete(connectionId);
            return { success: true };
        } catch (e: unknown) {
            return { success: false, error: getErrorMessage(e) };
        }
    }

    /**
     * 获取数据库列表
     */
    async getDatabases(connectionId: string): Promise<{ success: boolean; databases?: string[]; error?: string }> {
        try {
            const conn = this.connections.get(connectionId);
            if (!conn) {
                return { success: false, error: '连接不存在' };
            }
            
            let databases: string[] = [];
            
            if (conn.config.type === 'mysql') {
                const [rows] = await conn.client.query('SHOW DATABASES') as MySQLQueryResult;
                databases = (rows as DatabaseRow[]).map(r => r.Database as string);
            } else if (conn.config.type === 'postgresql') {
                const result = await conn.client.query(
                    "SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname"
                );
                databases = result.rows.map((r: DatabaseRow) => r.datname as string);
            } else if (conn.config.type === 'sqlite') {
                databases = ['main'];
            }
            
            return { success: true, databases };
        } catch (e: unknown) {
            return { success: false, error: getErrorMessage(e) };
        }
    }

    /**
     * 获取表列表
     */
    async getTables(connectionId: string, database: string): Promise<{ success: boolean; tables?: string[]; error?: string }> {
        try {
            const conn = this.connections.get(connectionId);
            if (!conn) {
                return { success: false, error: '连接不存在' };
            }
            
            let tables: string[] = [];
            
            if (conn.config.type === 'mysql') {
                const [rows] = await conn.client.query(`SHOW TABLES FROM \`${database}\``) as MySQLQueryResult;
                tables = (rows as DatabaseRow[]).map(r => Object.values(r)[0] as string);
            } else if (conn.config.type === 'postgresql') {
                const client = new this.drivers.pg!.Client({
                    host: conn.config.host,
                    port: conn.config.port,
                    user: conn.config.user,
                    password: conn.config.password,
                    database: database,
                });
                await client.connect();
                const result = await client.query(
                    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"
                );
                tables = result.rows.map(r => r.tablename as string);
                await client.end();
            } else if (conn.config.type === 'sqlite') {
                const rows = conn.client.prepare(
                    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
                ).all() as DatabaseRow[];
                tables = rows.map(r => r.name as string);
            }
            
            return { success: true, tables };
        } catch (e: unknown) {
            return { success: false, error: getErrorMessage(e) };
        }
    }

    /**
     * 获取表结构
     */
    async getTableStructure(connectionId: string, database: string, table: string): Promise<TableStructureResult> {
        try {
            const conn = this.connections.get(connectionId);
            if (!conn) {
                return { success: false, error: '连接不存在' };
            }
            
            let columns: ColumnInfo[] = [];
            
            if (conn.config.type === 'mysql') {
                const [rows] = await conn.client.query(`DESCRIBE \`${database}\`.\`${table}\``) as MySQLQueryResult;
                columns = (rows as DatabaseRow[]).map(r => ({
                    name: r.Field as string,
                    type: r.Type as string,
                    nullable: r.Null === 'YES',
                    key: r.Key as string,
                    default: r.Default as string | null,
                    extra: r.Extra as string,
                }));
            } else if (conn.config.type === 'postgresql') {
                const client = new this.drivers.pg!.Client({
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
                columns = result.rows.map(r => ({
                    name: r.column_name as string,
                    type: r.data_type as string,
                    nullable: r.is_nullable === 'YES',
                    key: '',
                    default: r.column_default as string | null,
                    extra: '',
                }));
                await client.end();
            } else if (conn.config.type === 'sqlite') {
                const rows = conn.client.prepare(`PRAGMA table_info("${table}")`).all() as DatabaseRow[];
                columns = rows.map(r => ({
                    name: r.name as string,
                    type: r.type as string,
                    nullable: r.notnull === 0,
                    key: r.pk ? 'PRI' : '',
                    default: r.dflt_value as string | null,
                    extra: '',
                }));
            }
            
            return { success: true, columns };
        } catch (e: unknown) {
            return { success: false, error: getErrorMessage(e) };
        }
    }

    /**
     * 获取表数据（分页）
     */
    async getTableData(
        connectionId: string, 
        database: string, 
        table: string, 
        page: number, 
        pageSize: number
    ): Promise<DBQueryResult<DatabaseRow>> {
        try {
            const conn = this.connections.get(connectionId);
            if (!conn) {
                return { success: false, error: '连接不存在' };
            }
            
            const offset = (page - 1) * pageSize;
            let data: DatabaseRow[] = [];
            let total = 0;
            
            if (conn.config.type === 'mysql') {
                const [countRows] = await conn.client.query(
                    `SELECT COUNT(*) as count FROM \`${database}\`.\`${table}\``
                );
                total = countRows[0].count;
                const [rows] = await conn.client.query(
                    `SELECT * FROM \`${database}\`.\`${table}\` LIMIT ${pageSize} OFFSET ${offset}`
                );
                data = rows;
            } else if (conn.config.type === 'postgresql') {
                const client = new this.drivers.pg!.Client({
                    host: conn.config.host,
                    port: conn.config.port,
                    user: conn.config.user,
                    password: conn.config.password,
                    database: database,
                });
                await client.connect();
                const countResult = await client.query(`SELECT COUNT(*) as count FROM "${table}"`);
                total = parseInt(countResult.rows[0].count);
                const result = await client.query(
                    `SELECT * FROM "${table}" LIMIT $1 OFFSET $2`, 
                    [pageSize, offset]
                );
                data = result.rows;
                await client.end();
            } else if (conn.config.type === 'sqlite') {
                const countRow = conn.client.prepare(`SELECT COUNT(*) as count FROM "${table}"`).get();
                total = countRow.count;
                data = conn.client.prepare(`SELECT * FROM "${table}" LIMIT ? OFFSET ?`).all(pageSize, offset);
            }
            
            return { success: true, data, total };
        } catch (e: unknown) {
            return { success: false, error: getErrorMessage(e) };
        }
    }

    /**
     * 执行查询
     */
    async executeQuery(
        connectionId: string, 
        database: string, 
        sql: string
    ): Promise<DBQueryResult<DatabaseRow>> {
        try {
            const conn = this.connections.get(connectionId);
            if (!conn) {
                return { success: false, error: '连接不存在' };
            }
            
            // SQL 安全验证
            const sqlValidation = validateSQL(sql);
            if (!sqlValidation.valid) {
                return { success: false, error: `SQL 验证失败: ${sqlValidation.error}` };
            }
            
            // 查询限制检查
            const limitCheck = checkQueryLimit(sql);
            if (!limitCheck.valid && limitCheck.error) {
                console.warn('[DB] Query limit warning:', limitCheck.error);
            }
            
            if (conn.config.type === 'mysql') {
                await conn.client.query(`USE \`${database}\``);
                const [rows, fields] = await conn.client.query(sql);
                if (Array.isArray(rows)) {
                    return { success: true, data: rows };
                } else {
                    return { success: true, affectedRows: rows.affectedRows };
                }
            } else if (conn.config.type === 'postgresql') {
                const client = new this.drivers.pg!.Client({
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
                const upperSql = sql.toUpperCase().trim();
                if (upperSql.startsWith('SELECT')) {
                    const rows = conn.client.prepare(sql).all();
                    return { success: true, data: rows };
                } else {
                    const info = conn.client.prepare(sql).run();
                    return { success: true, affectedRows: info.changes };
                }
            }
            
            return { success: false, error: '不支持的数据库类型' };
        } catch (e: unknown) {
            return { success: false, error: getErrorMessage(e) };
        }
    }

    /**
     * 更新字段值
     */
    async updateField(
        connectionId: string,
        table: string,
        column: string,
        value: unknown,
        primaryKey: string,
        primaryValue: unknown
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const conn = this.connections.get(connectionId);
            if (!conn) {
                return { success: false, error: '连接不存在' };
            }

            // 验证标识符
            const validation = validateIdentifiers([table, column, primaryKey]);
            if (!validation.valid) {
                return { success: false, error: `非法的标识符: ${validation.invalidIdentifier}` };
            }

            // 构建安全的 UPDATE 语句
            const updateStatement = buildUpdateStatement(table, column, primaryKey, conn.config.type);

            if (conn.config.type === 'mysql' || conn.config.type === 'postgresql') {
                await conn.client.query(updateStatement.sql, [value, primaryValue]);
            } else if (conn.config.type === 'sqlite') {
                conn.client.prepare(updateStatement.sql).run(value, primaryValue);
            }

            return { success: true };
        } catch (e: unknown) {
            return { success: false, error: getErrorMessage(e) };
        }
    }

    /**
     * 获取所有连接
     */
    getConnections(): DBConnection[] {
        return Array.from(this.connections.values());
    }

    /**
     * 获取单个连接
     */
    getConnection(connectionId: string): DBConnection | undefined {
        return this.connections.get(connectionId);
    }

    /**
     * 关闭所有连接
     */
    async closeAll(): Promise<void> {
        const closePromises = Array.from(this.connections.keys()).map(id => this.disconnect(id));
        await Promise.allSettled(closePromises);
    }
}

// 导出单例
export const databaseManager = new DatabaseManager();
