# ToolHub Shell - 用户手册

**版本**: 0.1.0  
**最后更新**: 2025-12-11

欢迎使用 ToolHub Shell！这是一个强大的桌面开发工具集合，集成了数据库管理、AI 对话、开发工具等功能。

---

## 📚 目录

1. [快速开始](#快速开始)
2. [功能介绍](#功能介绍)
3. [数据库管理](#数据库管理)
4. [Redis 管理](#redis-管理)
5. [MongoDB 管理](#mongodb-管理)
6. [开发工具](#开发工具)
7. [AI 对话](#ai-对话)
8. [常见问题](#常见问题)
9. [快捷键](#快捷键)

---

## 快速开始

### 安装

#### 从源码构建

```bash
# 克隆仓库
git clone https://github.com/yourusername/ToolHubPro.git
cd ToolHubPro

# 安装依赖
npm install

# 构建
npm run build

# 启动
npm start
```

#### 系统要求

- **操作系统**: macOS 10.13+, Windows 10+, Linux
- **Node.js**: 16.0+
- **内存**: 至少 4GB RAM

---

## 功能介绍

ToolHub Shell 提供以下核心功能：

### 🗄️ 数据库管理
- 支持 MySQL、PostgreSQL、SQLite
- 可视化查询和编辑
- SQL 安全执行

### 🔴 Redis 管理
- 支持所有 Redis 数据类型
- Key 浏览和搜索
- 实时数据查看

### 🍃 MongoDB 管理
- 文档 CRUD 操作
- 集合管理
- 查询构建器

### 🛠️ 开发工具
- JSON 格式化
- 正则表达式测试
- Base64 编解码
- Hash 计算
- 时间戳转换
- 颜色选择器
- JWT 解析

### 💬 AI 对话
- 集成多个 AI 平台
  - ChatGPT
  - Gemini
  - DeepSeek
  - Kimi
  - Grok
  - LMArena
- iframe 嵌入，保持登录状态
- 独立窗口模式

---

## 数据库管理

### 连接数据库

#### MySQL

1. 点击左侧导航栏的 **Database** 工具
2. 点击 **新建连接**
3. 填写连接信息：
   ```
   连接名称: My MySQL
   类型: MySQL
   主机: localhost
   端口: 3306
   用户名: root
   密码: your_password
   数据库: mydb (可选)
   ```
4. 点击 **测试连接** 验证配置
5. 点击 **连接** 建立连接

#### PostgreSQL

```
连接名称: My PostgreSQL
类型: PostgreSQL
主机: localhost
端口: 5432
用户名: postgres
密码: your_password
数据库: postgres
```

#### SQLite

```
连接名称: My SQLite
类型: SQLite
文件路径: /path/to/database.db
```

---

### 浏览数据库

连接成功后，左侧会显示数据库树：

```
📁 My MySQL
  📁 mysql
    📄 user
    📄 db
  📁 mydb
    📄 users
    📄 posts
```

点击表名即可查看表结构和数据。

---

### 查看表数据

1. 点击表名
2. 右侧显示表结构和数据
3. 支持分页浏览（每页 100 条）
4. 支持字段排序

#### 表结构视图

| 字段名 | 类型 | 空 | 主键 | 默认值 |
|--------|------|-----|------|--------|
| id | int | NO | ✓ | NULL |
| name | varchar(100) | YES | | NULL |
| email | varchar(255) | NO | | NULL |
| created_at | timestamp | YES | | CURRENT_TIMESTAMP |

#### 数据视图

| id | name | email | created_at |
|----|------|-------|------------|
| 1 | Alice | alice@example.com | 2025-01-01 10:00:00 |
| 2 | Bob | bob@example.com | 2025-01-02 11:00:00 |

---

### 编辑数据

**双击单元格**即可编辑：

1. 双击要编辑的单元格
2. 输入新值
3. 按 Enter 保存，Esc 取消

**支持的数据类型**:
- 字符串
- 数字
- 日期时间
- NULL（输入 `null` 或留空）

---

### 执行 SQL 查询

1. 点击 **SQL 查询** 标签
2. 在文本框输入 SQL 语句：
   ```sql
   SELECT * FROM users WHERE age > 18 ORDER BY name;
   ```
3. 点击 **执行** 或按 `Ctrl+Enter`
4. 查看结果

#### 支持的 SQL 语句

**✅ 允许**:
- `SELECT` 查询
- `INSERT` 插入
- `UPDATE` 更新
- `DELETE` 删除
- `CREATE TABLE` 创建表
- `ALTER TABLE` 修改表结构

**❌ 禁止** (安全考虑):
- SQL 注入尝试
- 多语句执行（`;` 分隔）
- 危险的系统命令

---

### 导出数据

1. 执行查询获取结果
2. 点击 **导出** 按钮
3. 选择格式：
   - CSV
   - JSON
   - Excel
4. 选择保存位置

---

## Redis 管理

### 连接 Redis

1. 点击左侧导航栏的 **Redis** 工具
2. 点击 **新建连接**
3. 填写连接信息：
   ```
   连接名称: My Redis
   主机: localhost
   端口: 6379
   密码: (可选)
   数据库: 0
   ```
4. 点击 **测试连接**
5. 点击 **连接**

---

### 浏览 Keys

连接成功后，可以：

1. **扫描 Keys**: 输入模式（如 `user:*`）搜索
2. **查看类型**: 每个 key 显示其类型图标
   - 📝 String
   - 📦 Hash
   - 📋 List
   - 🎯 Set
   - 📊 ZSet
3. **查看 TTL**: 显示剩余过期时间

---

### String 操作

**查看值**:
1. 点击 String 类型的 key
2. 右侧显示值

**设置值**:
1. 点击 **新建 Key**
2. 选择类型: String
3. 输入 key 名称和值
4. 可选设置 TTL（秒）
5. 点击 **保存**

**编辑值**:
1. 点击 key 查看
2. 点击 **编辑**
3. 修改值
4. 点击 **保存**

---

### Hash 操作

**查看 Hash**:
```
user:1001
  name: Alice
  age: 25
  email: alice@example.com
```

**添加字段**:
1. 点击 Hash
2. 点击 **添加字段**
3. 输入字段名和值
4. 点击 **保存**

**编辑字段**:
1. 双击字段值
2. 修改
3. 按 Enter 保存

**删除字段**:
1. 点击字段旁的 ❌ 图标
2. 确认删除

---

### List 操作

**查看 List**:
```
queue:tasks
  [0] task-001
  [1] task-002
  [2] task-003
```

**添加元素**:
- **LPUSH** (左侧添加): 点击 ⬅️ 按钮
- **RPUSH** (右侧添加): 点击 ➡️ 按钮

**删除元素**:
- 点击元素旁的 ❌ 图标

---

### Set 操作

**查看 Set**:
```
tags:post:1001
  - javascript
  - nodejs
  - tutorial
```

**添加成员**:
1. 点击 **添加成员**
2. 输入值
3. 点击 **保存**

**删除成员**:
- 点击成员旁的 ❌ 图标

---

### ZSet 操作

**查看 ZSet**:
```
leaderboard
  player1: 100
  player2: 95
  player3: 90
```

**添加成员**:
1. 点击 **添加成员**
2. 输入成员名称和分数
3. 点击 **保存**

**排序**:
- 默认按分数升序
- 点击 **⬆️/⬇️** 切换排序方向

---

## MongoDB 管理

### 连接 MongoDB

#### 标准连接

```
连接名称: My MongoDB
主机: localhost
端口: 27017
用户名: admin (可选)
密码: password (可选)
认证数据库: admin (可选)
```

#### URI 连接

```
连接名称: My MongoDB
URI: mongodb://admin:password@localhost:27017/mydb?authSource=admin
```

---

### 浏览数据库和集合

```
📁 My MongoDB
  📁 admin
    📄 system.users
  📁 mydb
    📄 users
    📄 posts
    📄 comments
```

点击集合名称即可查看文档。

---

### 查看文档

**列表视图**:
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Alice",
    "age": 25,
    "tags": ["javascript", "nodejs"]
  },
  {
    "_id": "507f1f77bcf86cd799439012",
    "name": "Bob",
    "age": 30,
    "tags": ["python", "django"]
  }
]
```

**详细视图**:
点击文档展开，显示完整 JSON 结构。

---

### 插入文档

1. 点击 **新建文档**
2. 在编辑器中输入 JSON：
   ```json
   {
     "name": "Charlie",
     "age": 28,
     "email": "charlie@example.com",
     "tags": ["golang", "docker"]
   }
   ```
3. 点击 **保存**

**注意**: `_id` 字段可省略，MongoDB 会自动生成。

---

### 更新文档

1. 点击要编辑的文档
2. 点击 **编辑**
3. 修改 JSON 内容
4. 点击 **保存**

---

### 删除文档

1. 点击文档
2. 点击 **删除**
3. 确认删除

---

### 查询文档

#### 简单查询

**过滤条件**:
```json
{"age": {"$gt": 25}}
```

**排序**:
```json
{"name": 1}  // 升序
{"age": -1}  // 降序
```

**分页**:
- Skip: 0
- Limit: 20

点击 **执行查询** 查看结果。

#### 高级查询

**查询操作符**:
```json
// 大于
{"age": {"$gt": 25}}

// 范围
{"age": {"$gte": 20, "$lte": 30}}

// 包含
{"tags": {"$in": ["javascript", "python"]}}

// 正则匹配
{"name": {"$regex": "^A"}}

// 逻辑运算
{"$or": [{"age": 25}, {"age": 30}]}
```

---

### 管理集合

#### 创建集合

1. 右键点击数据库名称
2. 选择 **新建集合**
3. 输入集合名称
4. 点击 **创建**

#### 删除集合

1. 右键点击集合名称
2. 选择 **删除集合**
3. 确认删除

#### 查看统计信息

点击集合名称，顶部显示：
```
📊 users 集合
文档数量: 1,234
大小: 2.5 MB
平均文档大小: 2.1 KB
```

---

### 索引管理

1. 点击集合
2. 切换到 **索引** 标签
3. 查看现有索引：
   ```
   _id_: { _id: 1 }
   name_1: { name: 1 }
   email_1_age_1: { email: 1, age: 1 }
   ```

---

## 开发工具

### JSON 格式化

1. 点击 **JSON** 工具
2. 粘贴或输入 JSON：
   ```json
   {"name":"Alice","age":25,"tags":["javascript","nodejs"]}
   ```
3. 点击 **格式化**
4. 查看美化后的 JSON：
   ```json
   {
     "name": "Alice",
     "age": 25,
     "tags": [
       "javascript",
       "nodejs"
     ]
   }
   ```

**功能**:
- ✅ 格式化/压缩
- ✅ 验证 JSON 语法
- ✅ 树形视图
- ✅ 复制路径

---

### 正则表达式测试

1. 点击 **Regex** 工具
2. 输入正则表达式：
   ```regex
   ^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$
   ```
3. 输入测试文本：
   ```
   alice@example.com
   bob@test
   charlie@example.co.uk
   ```
4. 查看匹配结果（高亮显示）

**功能**:
- ✅ 实时匹配
- ✅ 捕获组显示
- ✅ 标志支持（i, g, m）
- ✅ 常用正则模板

---

### Base64 编解码

**编码**:
1. 点击 **Codec** 工具
2. 选择 **Base64 编码**
3. 输入文本：`Hello, World!`
4. 获取结果：`SGVsbG8sIFdvcmxkIQ==`

**解码**:
1. 选择 **Base64 解码**
2. 输入：`SGVsbG8sIFdvcmxkIQ==`
3. 获取结果：`Hello, World!`

---

### Hash 计算

1. 点击 **Crypto** 工具
2. 选择算法：
   - MD5
   - SHA-1
   - SHA-256
   - SHA-512
3. 输入文本
4. 查看 Hash 值

---

### 时间戳转换

1. 点击 **Timestamp** 工具
2. **当前时间**: 显示当前 Unix 时间戳
3. **时间戳转日期**:
   - 输入：`1704067200`
   - 输出：`2025-01-01 00:00:00`
4. **日期转时间戳**:
   - 选择日期时间
   - 获取时间戳

---

### 颜色选择器

1. 点击 **Color** 工具
2. 使用颜色选择器选择颜色
3. 查看不同格式：
   ```
   HEX: #FF5733
   RGB: rgb(255, 87, 51)
   HSL: hsl(14, 100%, 60%)
   ```
4. 点击复制任意格式

---

### JWT 解析

1. 点击 **JWT** 工具
2. 粘贴 JWT token
3. 查看解析结果：
   ```json
   Header:
   {
     "alg": "HS256",
     "typ": "JWT"
   }
   
   Payload:
   {
     "sub": "1234567890",
     "name": "John Doe",
     "iat": 1516239022
   }
   ```

---

## AI 对话

### 使用 AI 聊天

1. 点击顶部 **Sites** 菜单
2. 选择 AI 平台：
   - ChatGPT
   - Gemini
   - DeepSeek
   - Kimi
   - Grok
   - LMArena

### iframe 模式

默认在应用内嵌入 iframe，优点：
- ✅ 快速切换
- ✅ 保持登录状态
- ✅ 一个窗口管理所有

### 独立窗口模式

如果 iframe 无法正常显示：
1. 点击工具栏的 **🪟 独立窗口** 按钮
2. 在新窗口中登录
3. 关闭窗口后，iframe 将自动刷新

### 清理数据

1. 点击工具栏的 **🗑️ 清理数据** 按钮
2. 清除该站点的所有缓存和 Cookie
3. 重新登录

---

## 常见问题

### Q: 数据库连接失败怎么办？

**A**: 检查以下项目：
1. ✅ 数据库服务是否启动
2. ✅ 主机地址和端口是否正确
3. ✅ 用户名和密码是否正确
4. ✅ 防火墙是否阻止连接
5. ✅ 数据库是否允许远程连接

---

### Q: Redis 连接超时？

**A**: 
1. 确认 Redis 服务运行：`redis-cli ping`
2. 检查 Redis 配置：`redis.conf`
   - `bind 127.0.0.1` → 允许本地连接
   - `protected-mode no` → 关闭保护模式（仅开发环境）
3. 检查防火墙端口 6379

---

### Q: MongoDB 认证失败？

**A**:
1. 确认用户名和密码正确
2. 确认 `authSource` 正确（通常是 `admin`）
3. 尝试使用 URI 连接方式
4. 检查 MongoDB 日志：`/var/log/mongodb/mongod.log`

---

### Q: AI 对话页面无法加载？

**A**:
1. 检查网络连接
2. 尝试使用 **独立窗口** 模式
3. 清理站点数据后重试
4. 检查是否需要登录

---

### Q: 如何更新应用？

**A**:
```bash
cd ToolHubPro
git pull origin main
npm install
npm run build
npm start
```

---

### Q: 数据安全吗？

**A**: 
✅ **是的！**
- 所有数据库连接在本地执行
- 不上传任何敏感信息
- 密码本地存储（加密）
- 支持 SSH 隧道（未来版本）

---

## 快捷键

### 全局

| 快捷键 | 功能 |
|--------|------|
| `Ctrl/Cmd + R` | 重新加载窗口 |
| `Ctrl/Cmd + Shift + I` | 打开开发者工具 |
| `Ctrl/Cmd + Q` | 退出应用 |

### 数据库

| 快捷键 | 功能 |
|--------|------|
| `Ctrl/Cmd + Enter` | 执行 SQL 查询 |
| `Ctrl/Cmd + S` | 保存更改 |
| `Ctrl/Cmd + F` | 搜索 |
| `Esc` | 取消编辑 |

### 开发工具

| 快捷键 | 功能 |
|--------|------|
| `Ctrl/Cmd + V` | 粘贴 |
| `Ctrl/Cmd + C` | 复制 |
| `Ctrl/Cmd + A` | 全选 |
| `Ctrl/Cmd + Z` | 撤销 |

---

## 技术支持

遇到问题？

1. **查看文档**: [API 参考](API_REFERENCE.md)
2. **提交 Issue**: [GitHub Issues](https://github.com/yourusername/ToolHubPro/issues)
3. **联系作者**: your.email@example.com

---

**感谢使用 ToolHub Shell！** 🎉

如果觉得有用，欢迎 ⭐️ Star 项目！
