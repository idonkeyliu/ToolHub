/**
 * 共享连接配置类型定义
 * 用于主进程、预加载脚本和渲染进程之间的类型一致性
 */

// 数据库连接配置
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

// Redis 连接配置
export interface RedisConnectionConfig {
    id?: string;
    name: string;
    host: string;
    port: number;
    password?: string;
    database: number;
    tls?: boolean;
}

// MongoDB 连接配置
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

// SSH 服务器配置
export interface ServerConfig {
    id?: string;
    name: string;
    host: string;
    port: number;
    username: string;
    authType: 'password' | 'key';
    password?: string;
    privateKey?: string;
    tags?: string[];
}
