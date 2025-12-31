/**
 * llmHub 全局 API 类型声明
 * 统一管理所有 IPC 接口类型，避免各工具文件重复声明
 */

import type { DBConnectionConfig, RedisConnectionConfig, MongoConnectionConfig, ServerConfig } from '../../shared/types';

// ============ 通用响应类型 ============

/** 基础响应 */
interface BaseResponse {
  success: boolean;
  error?: string;
}

/** 带数据的响应 */
interface DataResponse<T> extends BaseResponse {
  data?: T;
}

// ============ 数据库 API 类型 ============

interface TableColumn {
  name: string;
  type: string;
  nullable: boolean;
  key: string;
  default: any;
  extra: string;
}

interface DatabaseAPI {
  testConnection: (config: DBConnectionConfig) => Promise<BaseResponse>;
  connect: (config: DBConnectionConfig) => Promise<BaseResponse & { connectionId?: string }>;
  disconnect: (connectionId: string) => Promise<BaseResponse>;
  getDatabases: (connectionId: string) => Promise<BaseResponse & { databases?: string[] }>;
  getTables: (connectionId: string, database: string) => Promise<BaseResponse & { tables?: string[] }>;
  getTableStructure: (connectionId: string, database: string, table: string) => Promise<BaseResponse & { columns?: TableColumn[] }>;
  getTableData: (connectionId: string, database: string, table: string, page: number, pageSize: number) => Promise<BaseResponse & { data?: any[]; total?: number }>;
  executeQuery: (connectionId: string, database: string, sql: string) => Promise<BaseResponse & { data?: any[]; affectedRows?: number }>;
  updateRecord: (connectionId: string, database: string, table: string, primaryKey: string, primaryValue: any, column: string, value: any) => Promise<BaseResponse>;
}

// ============ Redis API 类型 ============

interface RedisAPI {
  testConnection: (config: RedisConnectionConfig) => Promise<BaseResponse>;
  connect: (config: RedisConnectionConfig) => Promise<BaseResponse & { connectionId?: string }>;
  disconnect: (connectionId: string) => Promise<BaseResponse>;
  selectDB: (connectionId: string, db: number) => Promise<BaseResponse>;
  scan: (connectionId: string, cursor: string, pattern: string, count: number) => Promise<BaseResponse & { cursor?: string; keys?: string[] }>;
  getType: (connectionId: string, key: string) => Promise<BaseResponse & { type?: string }>;
  getTTL: (connectionId: string, key: string) => Promise<BaseResponse & { ttl?: number }>;
  setTTL: (connectionId: string, key: string, ttl: number) => Promise<BaseResponse>;
  deleteKey: (connectionId: string, key: string) => Promise<BaseResponse>;
  renameKey: (connectionId: string, oldKey: string, newKey: string) => Promise<BaseResponse>;
  getString: (connectionId: string, key: string) => Promise<BaseResponse & { value?: string }>;
  setString: (connectionId: string, key: string, value: string, ttl?: number) => Promise<BaseResponse>;
  getHash: (connectionId: string, key: string) => Promise<BaseResponse & { value?: Record<string, string> }>;
  setHashField: (connectionId: string, key: string, field: string, value: string) => Promise<BaseResponse>;
  deleteHashField: (connectionId: string, key: string, field: string) => Promise<BaseResponse>;
  getList: (connectionId: string, key: string, start: number, stop: number) => Promise<BaseResponse & { value?: string[]; total?: number }>;
  pushList: (connectionId: string, key: string, value: string, position: 'left' | 'right') => Promise<BaseResponse>;
  deleteListItem: (connectionId: string, key: string, index: number, count: number) => Promise<BaseResponse>;
  getSet: (connectionId: string, key: string) => Promise<BaseResponse & { value?: string[] }>;
  addSetMember: (connectionId: string, key: string, member: string) => Promise<BaseResponse>;
  removeSetMember: (connectionId: string, key: string, member: string) => Promise<BaseResponse>;
  getZSet: (connectionId: string, key: string, withScores: boolean) => Promise<BaseResponse & { value?: Array<{ member: string; score: number }>; total?: number }>;
  addZSetMember: (connectionId: string, key: string, member: string, score: number) => Promise<BaseResponse>;
  removeZSetMember: (connectionId: string, key: string, member: string) => Promise<BaseResponse>;
  executeCommand: (connectionId: string, command: string) => Promise<BaseResponse & { result?: any }>;
  dbSize: (connectionId: string) => Promise<BaseResponse & { size?: number }>;
}

// ============ MongoDB API 类型 ============

interface MongoCollectionStats {
  count: number;
  size: number;
  avgObjSize: number;
}

interface MongoIndex {
  name: string;
  key: Record<string, number>;
}

interface MongoAPI {
  testConnection: (config: MongoConnectionConfig) => Promise<BaseResponse>;
  connect: (config: MongoConnectionConfig) => Promise<BaseResponse & { connectionId?: string }>;
  disconnect: (connectionId: string) => Promise<BaseResponse>;
  listDatabases: (connectionId: string) => Promise<BaseResponse & { databases?: string[] }>;
  listCollections: (connectionId: string, database: string) => Promise<BaseResponse & { collections?: string[] }>;
  getCollectionStats: (connectionId: string, database: string, collection: string) => Promise<BaseResponse & { stats?: MongoCollectionStats }>;
  findDocuments: (connectionId: string, database: string, collection: string, filter: string, sort: string, skip: number, limit: number) => Promise<BaseResponse & { documents?: any[]; total?: number }>;
  insertDocument: (connectionId: string, database: string, collection: string, document: string) => Promise<BaseResponse & { insertedId?: string }>;
  updateDocument: (connectionId: string, database: string, collection: string, id: string, document: string) => Promise<BaseResponse>;
  deleteDocument: (connectionId: string, database: string, collection: string, id: string) => Promise<BaseResponse>;
  getIndexes: (connectionId: string, database: string, collection: string) => Promise<BaseResponse & { indexes?: MongoIndex[] }>;
  runCommand: (connectionId: string, database: string, command: string) => Promise<BaseResponse & { result?: any }>;
  dropCollection: (connectionId: string, database: string, collection: string) => Promise<BaseResponse>;
  createCollection: (connectionId: string, database: string, collection: string) => Promise<BaseResponse>;
}

// ============ Terminal API 类型 ============

interface TerminalAPI {
  testConnection: (config: ServerConfig) => Promise<BaseResponse>;
  connect: (config: ServerConfig) => Promise<BaseResponse & { sessionId?: string }>;
  disconnect: (sessionId: string) => Promise<BaseResponse>;
  execute: (sessionId: string, command: string) => Promise<BaseResponse & { output?: string }>;
}

// ============ Sync API 类型 ============

interface FileDiff {
  path: string;
  status: 'synced' | 'modified' | 'added' | 'deleted';
  gitSize?: number;
  serverSize?: number;
}

interface ServerSyncResult {
  serverId: string;
  serverName: string;
  status: 'success' | 'error';
  error?: string;
  files: FileDiff[];
}

interface SyncResult {
  projectId: string;
  timestamp: number;
  servers: ServerSyncResult[];
}

interface SyncAPI {
  testConnection: (config: ServerConfig) => Promise<BaseResponse>;
  checkSync: (project: any, servers: ServerConfig[]) => Promise<SyncResult>;
  getFileContent: (server: ServerConfig, filePath: string) => Promise<BaseResponse & { content?: string }>;
}

// ============ SaveFile API 类型 ============

interface SaveFileOptions {
  defaultName: string;
  filters: { name: string; extensions: string[] }[];
  data: string;
}

interface SaveFileResponse extends BaseResponse {
  canceled?: boolean;
  filePath?: string;
}

type SaveFileAPI = (options: SaveFileOptions) => Promise<SaveFileResponse>;

// ============ llmHub 全局类型 ============

interface LlmHub {
  version: string;
  sites: any[];
  lastSite: string;
  openExternal: (url: string) => void;
  persistLastSite: (key: string) => void;
  clearActivePartition: (partition: string) => void;
  openSiteWindow: (key: string) => void;
  setTrafficLightVisibility: (visible: boolean) => void;
  saveFile: SaveFileAPI;
  db: DatabaseAPI;
  redis: RedisAPI;
  mongo: MongoAPI;
  terminal: TerminalAPI;
  sync: SyncAPI;
  listEmojiFiles: (categoryDir: string) => Promise<string[]>;
}

declare global {
  const llmHub: LlmHub;
}

export type {
  BaseResponse,
  DataResponse,
  TableColumn,
  DatabaseAPI,
  RedisAPI,
  MongoAPI,
  MongoCollectionStats,
  MongoIndex,
  TerminalAPI,
  SyncAPI,
  SyncResult,
  FileDiff,
  ServerSyncResult,
  SaveFileAPI,
  SaveFileOptions,
  SaveFileResponse,
  LlmHub,
};
