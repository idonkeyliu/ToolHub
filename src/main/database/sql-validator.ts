/**
 * SQL 安全验证工具
 * 用于防止 SQL 注入攻击
 */

/**
 * 验证 SQL 标识符（表名、列名等）是否合法
 * 
 * @param identifier - 待验证的标识符
 * @returns 是否合法
 * 
 * @example
 * ```typescript
 * validateIdentifier('users')        // => true
 * validateIdentifier('user_name')    // => true
 * validateIdentifier('users; DROP')  // => false
 * validateIdentifier('users--')      // => false
 * ```
 */
export function validateIdentifier(identifier: string): boolean {
    if (!identifier || identifier.length === 0) {
        return false;
    }
    
    // 只允许字母、数字、下划线，且必须以字母或下划线开头
    const pattern = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
    return pattern.test(identifier);
}

/**
 * 验证多个标识符
 * 
 * @param identifiers - 标识符数组
 * @returns 验证结果，包含是否全部合法和第一个非法标识符
 */
export function validateIdentifiers(identifiers: string[]): {
    valid: boolean;
    invalidIdentifier?: string;
} {
    for (const identifier of identifiers) {
        if (!validateIdentifier(identifier)) {
            return { valid: false, invalidIdentifier: identifier };
        }
    }
    return { valid: true };
}

/**
 * 允许的 SQL 操作（只读操作）
 */
const ALLOWED_OPERATIONS = ['SELECT', 'SHOW', 'DESCRIBE', 'DESC', 'EXPLAIN'];

/**
 * 危险的 SQL 操作（写操作和结构变更）
 */
const DANGEROUS_OPERATIONS = [
    'DROP',
    'TRUNCATE',
    'DELETE',
    'UPDATE',
    'INSERT',
    'ALTER',
    'CREATE',
    'RENAME',
    'REPLACE',
    'GRANT',
    'REVOKE',
];

/**
 * 验证 SQL 查询是否安全
 * 
 * @param sql - SQL 查询语句
 * @returns 验证结果
 * 
 * @example
 * ```typescript
 * validateSQL('SELECT * FROM users')           // => { valid: true }
 * validateSQL('DROP TABLE users')              // => { valid: false, error: '不允许执行 DROP 操作' }
 * validateSQL('SELECT * FROM users; DROP...')  // => { valid: false, error: '不允许执行 DROP 操作' }
 * ```
 */
export function validateSQL(sql: string): {
    valid: boolean;
    error?: string;
} {
    if (!sql || sql.trim().length === 0) {
        return { valid: false, error: 'SQL 语句不能为空' };
    }
    
    // 转换为大写并移除多余空格
    let cleaned = sql.trim().toUpperCase();
    
    // 移除单行注释（-- 注释）
    cleaned = cleaned.replace(/--.*$/gm, '');
    
    // 移除多行注释（/* */ 注释）
    cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
    
    // 移除多余空格
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    // 检查是否为空
    if (cleaned.length === 0) {
        return { valid: false, error: 'SQL 语句不能为空' };
    }
    
    // 检查是否包含危险操作
    for (const op of DANGEROUS_OPERATIONS) {
        // 使用单词边界匹配，避免误判（如 UPDATE_TIME 列名）
        const pattern = new RegExp(`\\b${op}\\b`, 'i');
        if (pattern.test(cleaned)) {
            return {
                valid: false,
                error: `不允许执行 ${op} 操作，此工具仅支持只读查询`,
            };
        }
    }
    
    // 检查是否以允许的操作开头
    const firstWord = cleaned.split(/\s+/)[0];
    if (!ALLOWED_OPERATIONS.includes(firstWord)) {
        return {
            valid: false,
            error: `不允许的操作: ${firstWord}。仅支持: ${ALLOWED_OPERATIONS.join(', ')}`,
        };
    }
    
    // 检查是否包含多条语句（通过分号分隔）
    const statements = sql.split(';').filter((s) => s.trim().length > 0);
    if (statements.length > 1) {
        return {
            valid: false,
            error: '不允许执行多条 SQL 语句',
        };
    }
    
    return { valid: true };
}

/**
 * 转义 SQL 标识符（为不同数据库添加引号）
 * 
 * @param identifier - 标识符
 * @param dbType - 数据库类型
 * @returns 转义后的标识符
 */
export function escapeIdentifier(identifier: string, dbType: 'mysql' | 'postgresql' | 'sqlite'): string {
    if (!validateIdentifier(identifier)) {
        throw new Error(`非法的标识符: ${identifier}`);
    }
    
    switch (dbType) {
        case 'mysql':
            return `\`${identifier}\``;
        case 'postgresql':
            return `"${identifier}"`;
        case 'sqlite':
            return `"${identifier}"`;
        default:
            throw new Error(`不支持的数据库类型: ${dbType}`);
    }
}

/**
 * 构建安全的 UPDATE 语句
 * 
 * @param table - 表名
 * @param column - 列名
 * @param primaryKey - 主键列名
 * @param dbType - 数据库类型
 * @returns SQL 语句模板和参数占位符类型
 */
export function buildUpdateStatement(
    table: string,
    column: string,
    primaryKey: string,
    dbType: 'mysql' | 'postgresql' | 'sqlite'
): { sql: string; paramStyle: 'question' | 'dollar' } {
    // 验证所有标识符
    const validation = validateIdentifiers([table, column, primaryKey]);
    if (!validation.valid) {
        throw new Error(`非法的标识符: ${validation.invalidIdentifier}`);
    }
    
    const tableEscaped = escapeIdentifier(table, dbType);
    const columnEscaped = escapeIdentifier(column, dbType);
    const pkEscaped = escapeIdentifier(primaryKey, dbType);
    
    if (dbType === 'postgresql') {
        // PostgreSQL 使用 $1, $2 占位符
        return {
            sql: `UPDATE ${tableEscaped} SET ${columnEscaped} = $1 WHERE ${pkEscaped} = $2`,
            paramStyle: 'dollar',
        };
    } else {
        // MySQL 和 SQLite 使用 ? 占位符
        return {
            sql: `UPDATE ${tableEscaped} SET ${columnEscaped} = ? WHERE ${pkEscaped} = ?`,
            paramStyle: 'question',
        };
    }
}

/**
 * 检查 SQL 查询结果数量限制
 * 
 * @param sql - SQL 语句
 * @param maxLimit - 最大允许的 LIMIT 值
 * @returns 是否在限制范围内
 */
export function checkQueryLimit(sql: string, maxLimit: number = 10000): {
    valid: boolean;
    error?: string;
} {
    const upperSql = sql.toUpperCase();
    const limitMatch = upperSql.match(/LIMIT\s+(\d+)/);
    
    if (limitMatch) {
        const limit = parseInt(limitMatch[1], 10);
        if (limit > maxLimit) {
            return {
                valid: false,
                error: `查询结果数量超过限制 (${limit} > ${maxLimit})`,
            };
        }
    }
    
    // 如果没有 LIMIT 子句，建议添加
    if (!limitMatch && !upperSql.includes('COUNT(')) {
        console.warn('[SQL Validator] 查询未指定 LIMIT，可能返回大量数据');
    }
    
    return { valid: true };
}
