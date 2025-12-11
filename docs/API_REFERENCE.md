# ToolHub Shell - API 参考文档

**版本**: 0.1.0  
**最后更新**: 2025-12-11

---

## 📚 目录

1. [数据库管理器 API](#数据库管理器-api)
2. [Redis 管理器 API](#redis-管理器-api)
3. [MongoDB 管理器 API](#mongodb-管理器-api)
4. [窗口管理器 API](#窗口管理器-api)
5. [IPC 通信协议](#ipc-通信协议)

---

## 数据库管理器 API

### `DatabaseManager`

数据库管理器负责管理 MySQL、PostgreSQL 和 SQLite 数据库连接。

#### 导入

```typescript
import { databaseManager } from './main/database/database-manager.js';
```

#### 初始化

```typescript
await databaseManager.initialize();
```

加载所有数据库驱动（mysql2、pg、better-sqlite3）。

---

### 方法列表

#### `testConnection(config: DBConnectionConfig)`

测试数据库连接是否有效。

**参数**:
```typescript
interface DBConnectionConfig {
    id?: string;
    name: string;
    type: 'mysql' | 'postgresql' | 'sqlite';
    host?: string;          // MySQL/PostgreSQL
    port?: number;          // MySQL/PostgreSQL
    user?: string;          // MySQL/PostgreSQL
    password?: string;      // MySQL/PostgreSQL
    database?: string;      // MySQL/PostgreSQL
    sqlitePath?: string;    // SQLite
}
```

**返回值**:
```typescript
Promise<{ success: boolean; error?: string }>
```

**示例**:
```typescript
const result = await databaseManager.testConnection({
    type: 'mysql',
    name: 'My Database',
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'password',
    database: 'mydb'
});

if (result.success) {
    console.log('连接成功！');
} else {
    console.error('连接失败：', result.error);
}
```

---

#### `connect(config: DBConnectionConfig)`

建立数据库连接。

**返回值**:
```typescript
Promise<{ 
    success: boolean; 
    connectionId?: string; 
    error?: string 
}>
```

**示例**:
```typescript
const result = await databaseManager.connect({
    type: 'postgresql',
    name: 'PG Database',
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'password',
    database: 'testdb'
});

const connectionId = result.connectionId;
```

---

#### `disconnect(connectionId: string)`

断开数据库连接。

**返回值**:
```typescript
Promise<{ success: boolean; error?: string }>
```

---

#### `getDatabases(connectionId: string)`

获取数据库列表。

**返回值**:
```typescript
Promise<{ 
    success: boolean; 
    databases?: string[]; 
    error?: string 
}>
```

**示例**:
```typescript
const result = await databaseManager.getDatabases(connectionId);
console.log('数据库列表：', result.databases);
// ['mysql', 'test', 'mydb']
```

---

#### `getTables(connectionId: string, database: string)`

获取指定数据库的表列表。

**返回值**:
```typescript
Promise<{ 
    success: boolean; 
    tables?: string[]; 
    error?: string 
}>
```

---

#### `getTableStructure(connectionId: string, database: string, table: string)`

获取表结构信息。

**返回值**:
```typescript
Promise<{ 
    success: boolean; 
    columns?: ColumnInfo[]; 
    primaryKey?: string; 
    error?: string 
}>

interface ColumnInfo {
    name: string;
    type: string;
    nullable: boolean;
    defaultValue: any;
    isPrimaryKey: boolean;
    extra?: string;
}
```

---

#### `getTableData(connectionId: string, database: string, table: string, page: number, pageSize: number)`

获取表数据（分页）。

**参数**:
- `page`: 页码（从 1 开始）
- `pageSize`: 每页数量

**返回值**:
```typescript
Promise<{ 
    success: boolean; 
    data?: DatabaseRow[]; 
    total?: number; 
    error?: string 
}>

type DatabaseRow = Record<string, any>;
```

---

#### `executeQuery(connectionId: string, database: string, sql: string)`

执行 SQL 查询。

**安全特性**:
- 自动进行 SQL 注入检查
- 验证标识符合法性
- 限制危险操作

**返回值**:
```typescript
Promise<{ 
    success: boolean; 
    data?: DatabaseRow[]; 
    total?: number; 
    error?: string 
}>
```

**示例**:
```typescript
const result = await databaseManager.executeQuery(
    connectionId,
    'mydb',
    'SELECT * FROM users WHERE age > 18'
);
```

---

#### `updateField(connectionId: string, database: string, table: string, column: string, primaryKey: string, newValue: any)`

更新单个字段值（使用参数化查询）。

**参数**:
- `primaryKey`: 主键列名
- `newValue`: 新值（会自动转换类型）

**返回值**:
```typescript
Promise<{ success: boolean; error?: string }>
```

---

## Redis 管理器 API

### `RedisManager`

Redis 管理器负责管理 Redis 连接和操作。

#### 导入

```typescript
import { redisManager } from './main/redis/redis-manager.js';
```

---

### 连接管理

#### `testConnection(config: RedisConnectionConfig)`

**参数**:
```typescript
interface RedisConnectionConfig {
    name: string;
    host: string;
    port: number;
    password?: string;
    db?: number;
}
```

---

#### `connect(config: RedisConnectionConfig)`

**返回值**:
```typescript
Promise<{ 
    success: boolean; 
    connectionId?: string; 
    error?: string 
}>
```

---

#### `disconnect(connectionId: string)`

---

#### `selectDB(connectionId: string, db: number)`

切换数据库。

---

### Key 操作

#### `scan(connectionId: string, cursor: string, pattern: string, count: number)`

扫描 keys。

**返回值**:
```typescript
Promise<{ 
    success: boolean; 
    cursor?: string; 
    keys?: string[]; 
    error?: string 
}>
```

**示例**:
```typescript
const result = await redisManager.scan(connectionId, '0', 'user:*', 100);
console.log('游标：', result.cursor);
console.log('Keys：', result.keys);
```

---

#### `getType(connectionId: string, key: string)`

获取 key 类型。

**返回值**:
```typescript
Promise<{ 
    success: boolean; 
    type?: string; // 'string' | 'hash' | 'list' | 'set' | 'zset'
    error?: string 
}>
```

---

#### `getTTL(connectionId: string, key: string)`

获取 key 的过期时间（秒）。

**返回值**:
```typescript
Promise<{ 
    success: boolean; 
    ttl?: number; // -1: 永不过期, -2: 不存在
    error?: string 
}>
```

---

#### `setTTL(connectionId: string, key: string, ttl: number)`

设置 key 的过期时间。

---

#### `deleteKey(connectionId: string, key: string)`

删除 key。

---

### String 操作

#### `getString(connectionId: string, key: string)`

获取 String 值。

---

#### `setString(connectionId: string, key: string, value: string, ttl?: number)`

设置 String 值（可选 TTL）。

**示例**:
```typescript
await redisManager.setString(connectionId, 'session:123', 'user_data', 3600);
```

---

### Hash 操作

#### `getHash(connectionId: string, key: string)`

获取 Hash 所有字段。

**返回值**:
```typescript
Promise<{ 
    success: boolean; 
    value?: Record<string, string>; 
    error?: string 
}>
```

---

#### `setHashField(connectionId: string, key: string, field: string, value: string)`

设置 Hash 字段。

---

#### `deleteHashField(connectionId: string, key: string, field: string)`

删除 Hash 字段。

---

### List 操作

#### `getList(connectionId: string, key: string, start: number, stop: number)`

获取 List 元素。

**参数**:
- `start`: 起始索引（0-based）
- `stop`: 结束索引（-1 表示全部）

**返回值**:
```typescript
Promise<{ 
    success: boolean; 
    value?: string[]; 
    total?: number; 
    error?: string 
}>
```

---

#### `pushList(connectionId: string, key: string, value: string, position: 'left' | 'right')`

向 List 添加元素。

---

#### `deleteListItem(connectionId: string, key: string, index: number, count: number)`

删除 List 元素。

**参数**:
- `index`: 要删除的索引
- `count`: 删除数量

---

### Set 操作

#### `getSet(connectionId: string, key: string)`

获取 Set 所有成员。

---

#### `addSetMember(connectionId: string, key: string, member: string)`

添加 Set 成员。

---

#### `removeSetMember(connectionId: string, key: string, member: string)`

删除 Set 成员。

---

### ZSet 操作

#### `getZSet(connectionId: string, key: string, withScores: boolean)`

获取 ZSet 成员。

**参数**:
- `withScores`: 是否返回分数

**返回值**:
```typescript
Promise<{ 
    success: boolean; 
    value?: Array<{ member: string; score: number }>; 
    total?: number; 
    error?: string 
}>
```

---

#### `addZSetMember(connectionId: string, key: string, member: string, score: number)`

添加 ZSet 成员。

**示例**:
```typescript
await redisManager.addZSetMember(connectionId, 'leaderboard', 'player1', 100);
```

---

#### `removeZSetMember(connectionId: string, key: string, member: string)`

删除 ZSet 成员。

---

### 其他操作

#### `executeCommand(connectionId: string, command: string)`

执行原始 Redis 命令。

**示例**:
```typescript
const result = await redisManager.executeCommand(connectionId, 'INFO server');
```

---

#### `dbSize(connectionId: string)`

获取当前数据库的 key 数量。

---

## MongoDB 管理器 API

### `MongoManager`

MongoDB 管理器负责管理 MongoDB 连接和文档操作。

#### 导入

```typescript
import { mongoManager } from './main/mongo/mongo-manager.js';
```

---

### 连接管理

#### `testConnection(config: MongoConnectionConfig)`

**参数**:
```typescript
interface MongoConnectionConfig {
    name: string;
    host?: string;
    port?: number;
    username?: string;
    password?: string;
    authSource?: string;
    uri?: string; // 或使用 URI 连接
}
```

**示例（标准连接）**:
```typescript
await mongoManager.connect({
    name: 'My MongoDB',
    host: 'localhost',
    port: 27017,
    username: 'admin',
    password: 'password',
    authSource: 'admin'
});
```

**示例（URI 连接）**:
```typescript
await mongoManager.connect({
    name: 'My MongoDB',
    uri: 'mongodb://admin:password@localhost:27017/mydb?authSource=admin'
});
```

---

### 数据库操作

#### `listDatabases(connectionId: string)`

获取数据库列表。

---

#### `listCollections(connectionId: string, database: string)`

获取集合列表。

---

#### `getCollectionStats(connectionId: string, database: string, collection: string)`

获取集合统计信息。

**返回值**:
```typescript
Promise<{ 
    success: boolean; 
    stats?: { 
        count: number; 
        size: number; 
        avgObjSize: number; 
    }; 
    error?: string 
}>
```

---

### 文档操作

#### `findDocuments(connectionId: string, database: string, collection: string, filterStr: string, sortStr: string, skip: number, limit: number)`

查询文档。

**参数**:
- `filterStr`: 过滤条件（JSON 字符串），如 `'{"age": {"$gt": 18}}'`
- `sortStr`: 排序规则（JSON 字符串），如 `'{"name": 1}'`
- `skip`: 跳过数量
- `limit`: 返回数量

**返回值**:
```typescript
Promise<{ 
    success: boolean; 
    documents?: any[]; 
    total?: number; 
    error?: string 
}>
```

**示例**:
```typescript
const result = await mongoManager.findDocuments(
    connectionId,
    'mydb',
    'users',
    '{"age": {"$gt": 18}}',
    '{"name": 1}',
    0,
    10
);
```

---

#### `insertDocument(connectionId: string, database: string, collection: string, documentStr: string)`

插入文档。

**参数**:
- `documentStr`: 文档内容（JSON 字符串）

**返回值**:
```typescript
Promise<{ 
    success: boolean; 
    insertedId?: string; 
    error?: string 
}>
```

**示例**:
```typescript
const result = await mongoManager.insertDocument(
    connectionId,
    'mydb',
    'users',
    '{"name": "Alice", "age": 25, "email": "alice@example.com"}'
);

console.log('插入的文档 ID：', result.insertedId);
```

---

#### `updateDocument(connectionId: string, database: string, collection: string, id: string, documentStr: string)`

更新文档。

**参数**:
- `id`: 文档 _id
- `documentStr`: 更新内容（JSON 字符串）

**示例**:
```typescript
await mongoManager.updateDocument(
    connectionId,
    'mydb',
    'users',
    '507f1f77bcf86cd799439011',
    '{"age": 26}'
);
```

---

#### `deleteDocument(connectionId: string, database: string, collection: string, id: string)`

删除文档。

---

### 索引操作

#### `getIndexes(connectionId: string, database: string, collection: string)`

获取集合索引。

**返回值**:
```typescript
Promise<{ 
    success: boolean; 
    indexes?: Array<{ 
        name: string; 
        key: Record<string, number>; 
    }>; 
    error?: string 
}>
```

---

### 集合操作

#### `createCollection(connectionId: string, database: string, collection: string)`

创建集合。

---

#### `dropCollection(connectionId: string, database: string, collection: string)`

删除集合。

---

### 命令执行

#### `runCommand(connectionId: string, database: string, commandStr: string)`

执行 MongoDB 命令。

**参数**:
- `commandStr`: 命令对象（JSON 字符串）

**示例**:
```typescript
const result = await mongoManager.runCommand(
    connectionId,
    'admin',
    '{"ping": 1}'
);
```

---

## 窗口管理器 API

### `WindowManager`

窗口管理器负责创建和配置 Electron 窗口。

#### 导入

```typescript
import { windowManager } from './main/window/window-manager.js';
```

---

### 方法

#### `createWindow(initialSite?: string, sites?: SiteDef[], __dirname?: string)`

创建主窗口。

**参数**:
```typescript
interface SiteDef {
    key: string;
    title: string;
    url: string;
    partition?: string;
    ua?: string;
}
```

**返回值**:
```typescript
BrowserWindow
```

---

#### `installFrameBypass()`

安装 Frame Bypass（绕过 X-Frame-Options 限制）。

---

#### `installPermissions()`

安装权限处理器（摄像头、麦克风、通知等）。

---

## IPC 通信协议

### 数据库相关

```typescript
// 测试连接
ipcRenderer.invoke('db:test', config)

// 建立连接
ipcRenderer.invoke('db:connect', config)

// 断开连接
ipcRenderer.invoke('db:disconnect', connectionId)

// 获取数据库列表
ipcRenderer.invoke('db:databases', connectionId)

// 获取表列表
ipcRenderer.invoke('db:tables', connectionId, database)

// 获取表结构
ipcRenderer.invoke('db:table-structure', connectionId, database, table)

// 获取表数据
ipcRenderer.invoke('db:table-data', connectionId, database, table, page, pageSize)

// 执行查询
ipcRenderer.invoke('db:query', connectionId, database, sql)

// 更新字段
ipcRenderer.invoke('db:update-field', connectionId, database, table, column, primaryKey, newValue)
```

---

### Redis 相关

```typescript
// 测试连接
ipcRenderer.invoke('redis:test', config)

// 建立连接
ipcRenderer.invoke('redis:connect', config)

// 断开连接
ipcRenderer.invoke('redis:disconnect', connectionId)

// 切换数据库
ipcRenderer.invoke('redis:select-db', connectionId, db)

// 扫描 keys
ipcRenderer.invoke('redis:scan', connectionId, cursor, pattern, count)

// 获取类型
ipcRenderer.invoke('redis:get-type', connectionId, key)

// String 操作
ipcRenderer.invoke('redis:get-string', connectionId, key)
ipcRenderer.invoke('redis:set-string', connectionId, key, value, ttl?)

// Hash 操作
ipcRenderer.invoke('redis:get-hash', connectionId, key)
ipcRenderer.invoke('redis:set-hash-field', connectionId, key, field, value)
ipcRenderer.invoke('redis:delete-hash-field', connectionId, key, field)

// List 操作
ipcRenderer.invoke('redis:get-list', connectionId, key, start, stop)
ipcRenderer.invoke('redis:push-list', connectionId, key, value, position)
ipcRenderer.invoke('redis:delete-list-item', connectionId, key, index, count)

// Set 操作
ipcRenderer.invoke('redis:get-set', connectionId, key)
ipcRenderer.invoke('redis:add-set-member', connectionId, key, member)
ipcRenderer.invoke('redis:remove-set-member', connectionId, key, member)

// ZSet 操作
ipcRenderer.invoke('redis:get-zset', connectionId, key, withScores)
ipcRenderer.invoke('redis:add-zset-member', connectionId, key, member, score)
ipcRenderer.invoke('redis:remove-zset-member', connectionId, key, member)
```

---

### MongoDB 相关

```typescript
// 测试连接
ipcRenderer.invoke('mongo:test', config)

// 建立连接
ipcRenderer.invoke('mongo:connect', config)

// 断开连接
ipcRenderer.invoke('mongo:disconnect', connectionId)

// 数据库列表
ipcRenderer.invoke('mongo:list-databases', connectionId)

// 集合列表
ipcRenderer.invoke('mongo:list-collections', connectionId, database)

// 集合统计
ipcRenderer.invoke('mongo:collection-stats', connectionId, database, collection)

// 文档操作
ipcRenderer.invoke('mongo:find', connectionId, database, collection, filterStr, sortStr, skip, limit)
ipcRenderer.invoke('mongo:insert', connectionId, database, collection, documentStr)
ipcRenderer.invoke('mongo:update', connectionId, database, collection, id, documentStr)
ipcRenderer.invoke('mongo:delete', connectionId, database, collection, id)

// 索引操作
ipcRenderer.invoke('mongo:indexes', connectionId, database, collection)

// 集合操作
ipcRenderer.invoke('mongo:create-collection', connectionId, database, collection)
ipcRenderer.invoke('mongo:drop-collection', connectionId, database, collection)

// 命令执行
ipcRenderer.invoke('mongo:run-command', connectionId, database, commandStr)
```

---

## 错误处理

所有 API 都遵循统一的错误处理格式：

```typescript
{
    success: boolean;
    error?: string;
    // ... 其他返回字段
}
```

**成功**:
```typescript
{ success: true, data: [...] }
```

**失败**:
```typescript
{ success: false, error: "错误描述" }
```

---

## 安全性

### SQL 注入防护

数据库管理器集成了 SQL 安全验证器：
- 自动检测危险 SQL 语句
- 验证标识符合法性
- 使用参数化查询

### Redis 安全

- 支持密码认证
- 命令执行限制

### MongoDB 安全

- 支持用户认证
- 权限控制

---

## 最佳实践

### 1. 连接管理

```typescript
// ✅ 正确：使用完毕后断开连接
const { connectionId } = await databaseManager.connect(config);
try {
    await databaseManager.executeQuery(connectionId, 'mydb', 'SELECT * FROM users');
} finally {
    await databaseManager.disconnect(connectionId);
}
```

### 2. 错误处理

```typescript
// ✅ 正确：总是检查 success 字段
const result = await redisManager.getString(connectionId, 'mykey');
if (!result.success) {
    console.error('获取失败：', result.error);
    return;
}
console.log('值：', result.value);
```

### 3. 分页查询

```typescript
// ✅ 正确：使用分页避免一次性加载大量数据
const pageSize = 100;
let page = 1;

while (true) {
    const result = await databaseManager.getTableData(
        connectionId, 
        'mydb', 
        'users', 
        page, 
        pageSize
    );
    
    if (!result.success || !result.data?.length) break;
    
    // 处理数据
    console.log(`第 ${page} 页，共 ${result.data.length} 条`);
    
    page++;
}
```

---

## 版本历史

### v0.1.0 (2025-12-11)
- ✨ 初始 API 设计
- ✨ 数据库管理器完整实现
- ✨ Redis 管理器完整实现
- ✨ MongoDB 管理器完整实现
- ✨ 窗口管理器基础功能
- ✨ 统一 IPC 通信协议

---

**更多信息**: 请参阅 [用户手册](USER_MANUAL.md) 和 [开发指南](DEVELOPMENT.md)
