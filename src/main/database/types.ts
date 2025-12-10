/**
 * 数据库类型定义
 */

import type { Connection as MySQL2Connection, Pool as MySQL2Pool, RowDataPacket, OkPacket, ResultSetHeader } from 'mysql2/promise';
import type { Client as PgClient, QueryResult as PgQueryResult } from 'pg';
import type BetterSqlite3 from 'better-sqlite3';

/**
 * 数据库驱动类型
 */
export type MySQLDriver = typeof import('mysql2/promise');
export type PostgreSQLDriver = typeof import('pg');
export type SQLiteDriver = typeof BetterSqlite3;

/**
 * 数据库客户端类型（允许 any 因为不同数据库接口差异太大）
 */
export type DBClient = any;

/**
 * MySQL 查询结果类型
 */
export type MySQLQueryResult = [RowDataPacket[] | OkPacket | ResultSetHeader, any];

/**
 * 数据库行数据
 */
export interface DatabaseRow {
    [key: string]: string | number | null;
}

/**
 * 表结构列信息
 */
export interface ColumnInfo {
    name: string;
    type: string;
    nullable: boolean;
    key: string;
    default: string | null;
    extra: string;
}

/**
 * 数据库驱动集合
 */
export interface DBDrivers {
    mysql2: MySQLDriver | null;
    pg: PostgreSQLDriver | null;
    betterSqlite3: SQLiteDriver | null;
}

/**
 * 数据库查询结果
 */
export interface DBQueryResult<T = any> {
    success: boolean;
    data?: T[];
    total?: number;
    affectedRows?: number;
    error?: string;
}

/**
 * 表结构查询结果
 */
export interface TableStructureResult {
    success: boolean;
    columns?: ColumnInfo[];
    error?: string;
}
