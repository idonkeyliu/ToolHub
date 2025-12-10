# 🚀 ToolHub 优化执行计划

> **开始时间**: 2025-12-10  
> **当前阶段**: Phase 1 - 安全性与稳定性  
> **预计完成**: 2025-12-24 (2周)

---

## 📋 任务追踪面板

### Phase 1: 安全性与稳定性 (2周)

| 任务 | 优先级 | 工作量 | 状态 | 负责人 | 完成日期 |
|------|-------|-------|------|--------|---------|
| 1.1 修复 SQL 注入漏洞 | 🔴 P0 | 2天 | 🟡 进行中 | - | - |
| 1.2 添加核心模块测试 | 🔴 P0 | 5天 | ⚪ 未开始 | - | - |
| 1.3 补充 TypeScript 类型 | 🟡 P1 | 3天 | ⚪ 未开始 | - | - |
| 1.4 统一错误处理 | 🟡 P1 | 2天 | ⚪ 未开始 | - | - |

**总进度**: 0% (0/4 完成)

---

## 🎯 当前任务: 1.1 修复 SQL 注入漏洞

### 任务详情

**目标**: 消除所有 SQL 注入风险  
**优先级**: 🔴 P0 - 安全漏洞，必须立即修复  
**预计时间**: 2 天

### 漏洞清单

#### 1. 字段更新操作

**位置**: `src/main.ts:330-360`

**当前代码**:
```typescript
// ❌ 字符串拼接，存在注入风险
ipcMain.handle('db:update-field', async (_, connectionId, table, column, value, primaryKey, primaryValue) => {
    try {
        const conn = dbConnections.get(connectionId);
        if (!conn) return { success: false, error: '连接不存在' };
        
        if (conn.type === 'mysql') {
            const sql = `UPDATE \`${table}\` SET \`${column}\` = ? WHERE \`${primaryKey}\` = ?`;
            await conn.client.query(sql, [value, primaryValue]);
        } else if (conn.type === 'postgresql') {
            const sql = `UPDATE "${table}" SET "${column}" = $1 WHERE "${primaryKey}" = $2`;
            await conn.client.query(sql, [value, primaryValue]);
        } else if (conn.type === 'sqlite') {
            const sql = `UPDATE "${table}" SET "${column}" = ? WHERE "${primaryKey}" = ?`;
            conn.client.prepare(sql).run(value, primaryValue);
        }
        
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
});
```

**问题**: 表名、列名直接拼接到 SQL 中

**修复方案**:
```typescript
// ✅ 添加标识符验证
function validateIdentifier(name: string): boolean {
    // 只允许字母、数字、下划线
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
}

// ✅ 使用参数化查询 + 标识符验证
ipcMain.handle('db:update-field', async (_, connectionId, table, column, value, primaryKey, primaryValue) => {
    try {
        // 验证标识符
        if (!validateIdentifier(table) || !validateIdentifier(column) || !validateIdentifier(primaryKey)) {
            return { success: false, error: '非法的表名或列名' };
        }
        
        const conn = dbConnections.get(connectionId);
        if (!conn) return { success: false, error: '连接不存在' };
        
        if (conn.type === 'mysql') {
            // 对于 MySQL，使用反引号保护标识符
            const sql = `UPDATE \`${table}\` SET \`${column}\` = ? WHERE \`${primaryKey}\` = ?`;
            await conn.client.query(sql, [value, primaryValue]);
        }
        // ... 其他数据库类似处理
        
        return { success: true };
    } catch (e: any) {
        console.error('[DB] Update field failed:', e);
        return { success: false, error: e.message };
    }
});
```

---

#### 2. 通用查询操作

**位置**: `src/main.ts:280-320`

**当前代码**:
```typescript
ipcMain.handle('db:query', async (_, connectionId, sql) => {
    try {
        const conn = dbConnections.get(connectionId);
        if (!conn) return { success: false, error: '连接不存在' };
        
        const upperSql = sql.trim().toUpperCase();
        
        // ❌ 简单的黑名单检查，容易绕过
        if (upperSql.includes('DROP DATABASE') || upperSql.includes('DROP SCHEMA')) {
            return { success: false, error: '不允许执行 DROP DATABASE 操作' };
        }
        
        // 执行查询...
    } catch (e: any) {
        return { success: false, error: e.message };
    }
});
```

**问题**: 
1. 黑名单验证容易绕过（如 `DR/**/OP`）
2. 没有限制危险操作

**修复方案**:
```typescript
// ✅ 使用白名单 + 严格的 SQL 解析
const ALLOWED_OPERATIONS = ['SELECT', 'SHOW', 'DESCRIBE', 'EXPLAIN'];
const DANGEROUS_OPERATIONS = ['DROP', 'TRUNCATE', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'CREATE'];

function validateSQL(sql: string): { valid: boolean; error?: string } {
    const trimmed = sql.trim().toUpperCase();
    
    // 移除注释
    const cleaned = trimmed.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    
    // 检查是否包含危险操作
    for (const op of DANGEROUS_OPERATIONS) {
        if (cleaned.includes(op)) {
            return { valid: false, error: `不允许执行 ${op} 操作` };
        }
    }
    
    // 检查是否以允许的操作开头
    const firstWord = cleaned.split(/\s+/)[0];
    if (!ALLOWED_OPERATIONS.includes(firstWord)) {
        return { valid: false, error: `不允许的操作: ${firstWord}` };
    }
    
    return { valid: true };
}

ipcMain.handle('db:query', async (_, connectionId, sql) => {
    try {
        // 验证 SQL
        const validation = validateSQL(sql);
        if (!validation.valid) {
            return { success: false, error: validation.error };
        }
        
        const conn = dbConnections.get(connectionId);
        if (!conn) return { success: false, error: '连接不存在' };
        
        // 执行查询...
    } catch (e: any) {
        console.error('[DB] Query failed:', e);
        return { success: false, error: e.message };
    }
});
```

---

### 修复步骤

- [ ] **步骤 1**: 创建 `src/main/database/sql-validator.ts`
  - 实现标识符验证函数
  - 实现 SQL 白名单验证函数
  - 添加单元测试

- [ ] **步骤 2**: 修复字段更新操作
  - 修改 `db:update-field` handler
  - 添加标识符验证
  - 测试各数据库类型

- [ ] **步骤 3**: 修复通用查询操作
  - 修改 `db:query` handler
  - 替换黑名单为白名单
  - 测试边界情况

- [ ] **步骤 4**: 安全测试
  - 编写 SQL 注入测试用例
  - 测试常见注入攻击
  - 验证防护有效性

---

### 测试用例

```typescript
// 测试用例清单
describe('SQL Injection Protection', () => {
  it('should reject malicious table names', async () => {
    const result = await updateField('users; DROP TABLE users--', 'name', 'test');
    expect(result.success).toBe(false);
  });
  
  it('should reject SQL comments in identifiers', async () => {
    const result = await updateField('users/**/--', 'name', 'test');
    expect(result.success).toBe(false);
  });
  
  it('should allow valid identifiers', async () => {
    const result = await updateField('users', 'user_name', 'test');
    expect(result.success).toBe(true);
  });
  
  it('should reject DROP operations', async () => {
    const result = await query('DROP TABLE users');
    expect(result.success).toBe(false);
  });
  
  it('should allow SELECT operations', async () => {
    const result = await query('SELECT * FROM users');
    expect(result.success).toBe(true);
  });
});
```

---

## 📝 提交检查清单

完成任务后，确保：

- [ ] 代码已修改并测试
- [ ] 所有测试用例通过
- [ ] 代码已提交到 Git
- [ ] 更新本文档状态
- [ ] 通知团队成员

---

## 📊 风险评估

| 风险 | 可能性 | 影响 | 缓解措施 |
|------|-------|------|---------|
| 现有功能受影响 | 中 | 高 | 充分测试，保持向后兼容 |
| 验证过于严格 | 中 | 中 | 提供配置选项，支持高级模式 |
| 性能下降 | 低 | 低 | 验证逻辑简单，性能影响可忽略 |

---

## 🔄 下一步

**当前任务完成后，自动开始**:

→ **任务 1.2**: 添加核心模块测试
