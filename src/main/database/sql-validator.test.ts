import { describe, it, expect } from 'vitest';
import {
    validateIdentifier,
    validateIdentifiers,
    validateSQL,
    escapeIdentifier,
    buildUpdateStatement,
    checkQueryLimit,
} from './sql-validator';

describe('SQL Validator', () => {
    describe('validateIdentifier', () => {
        it('should accept valid identifiers', () => {
            expect(validateIdentifier('users')).toBe(true);
            expect(validateIdentifier('user_name')).toBe(true);
            expect(validateIdentifier('_private')).toBe(true);
            expect(validateIdentifier('table123')).toBe(true);
            expect(validateIdentifier('CamelCase')).toBe(true);
        });

        it('should reject invalid identifiers', () => {
            expect(validateIdentifier('users; DROP')).toBe(false);
            expect(validateIdentifier('users--')).toBe(false);
            expect(validateIdentifier('users/*comment*/')).toBe(false);
            expect(validateIdentifier('users table')).toBe(false);
            expect(validateIdentifier('123table')).toBe(false);
            expect(validateIdentifier('user-name')).toBe(false);
            expect(validateIdentifier('')).toBe(false);
        });

        it('should reject identifiers with special characters', () => {
            expect(validateIdentifier('user@name')).toBe(false);
            expect(validateIdentifier('user#name')).toBe(false);
            expect(validateIdentifier('user$name')).toBe(false);
            expect(validateIdentifier('user.name')).toBe(false);
        });
    });

    describe('validateIdentifiers', () => {
        it('should accept all valid identifiers', () => {
            const result = validateIdentifiers(['users', 'user_id', 'email']);
            expect(result.valid).toBe(true);
            expect(result.invalidIdentifier).toBeUndefined();
        });

        it('should reject if any identifier is invalid', () => {
            const result = validateIdentifiers(['users', 'user; DROP', 'email']);
            expect(result.valid).toBe(false);
            expect(result.invalidIdentifier).toBe('user; DROP');
        });
    });

    describe('validateSQL', () => {
        describe('allowed operations', () => {
            it('should allow SELECT queries', () => {
                const result = validateSQL('SELECT * FROM users');
                expect(result.valid).toBe(true);
                expect(result.error).toBeUndefined();
            });

            it('should allow SHOW queries', () => {
                expect(validateSQL('SHOW TABLES').valid).toBe(true);
                expect(validateSQL('SHOW DATABASES').valid).toBe(true);
            });

            it('should allow DESCRIBE queries', () => {
                expect(validateSQL('DESCRIBE users').valid).toBe(true);
                expect(validateSQL('DESC users').valid).toBe(true);
            });

            it('should allow EXPLAIN queries', () => {
                expect(validateSQL('EXPLAIN SELECT * FROM users').valid).toBe(true);
            });
        });

        describe('dangerous operations', () => {
            it('should reject DROP operations', () => {
                const result = validateSQL('DROP TABLE users');
                expect(result.valid).toBe(false);
                expect(result.error).toContain('DROP');
            });

            it('should reject DELETE operations', () => {
                const result = validateSQL('DELETE FROM users WHERE id = 1');
                expect(result.valid).toBe(false);
                expect(result.error).toContain('DELETE');
            });

            it('should reject UPDATE operations', () => {
                const result = validateSQL('UPDATE users SET name = "test"');
                expect(result.valid).toBe(false);
                expect(result.error).toContain('UPDATE');
            });

            it('should reject INSERT operations', () => {
                const result = validateSQL('INSERT INTO users VALUES (1, "test")');
                expect(result.valid).toBe(false);
                expect(result.error).toContain('INSERT');
            });

            it('should reject TRUNCATE operations', () => {
                const result = validateSQL('TRUNCATE TABLE users');
                expect(result.valid).toBe(false);
                expect(result.error).toContain('TRUNCATE');
            });

            it('should reject ALTER operations', () => {
                const result = validateSQL('ALTER TABLE users ADD COLUMN email VARCHAR(255)');
                expect(result.valid).toBe(false);
                expect(result.error).toContain('ALTER');
            });

            it('should reject CREATE operations', () => {
                const result = validateSQL('CREATE TABLE test (id INT)');
                expect(result.valid).toBe(false);
                expect(result.error).toContain('CREATE');
            });
        });

        describe('SQL injection attempts', () => {
            it('should reject SQL with comments hiding dangerous operations', () => {
                const result = validateSQL('SELECT * FROM users; DROP TABLE users--');
                expect(result.valid).toBe(false);
            });

            it('should reject SQL with multiple statements', () => {
                const result = validateSQL('SELECT * FROM users; SELECT * FROM passwords');
                expect(result.valid).toBe(false);
                expect(result.error).toContain('多条');
            });

            it('should accept SQL with inline comments (comments are stripped)', () => {
                // 注释会被移除，剩下的 SQL 是安全的
                const result = validateSQL('SELECT * FROM users WHERE 1=1 /* DROP TABLE users */');
                expect(result.valid).toBe(true);
            });

            it('should reject SQL with dangerous operation after comment', () => {
                // 真实的 SQL 注入：注释外还有危险操作
                const result = validateSQL('SELECT * FROM users /* comment */ ; DROP TABLE users');
                expect(result.valid).toBe(false);
                expect(result.error).toContain('DROP');
            });

            it('should handle obfuscated DROP', () => {
                // 注意：这个测试确保我们检测到 DROP，即使有空格或注释
                const result = validateSQL('SELECT * FROM users WHERE name = "test" DROP TABLE users');
                expect(result.valid).toBe(false);
                expect(result.error).toContain('DROP');
            });
        });

        describe('edge cases', () => {
            it('should reject empty SQL', () => {
                expect(validateSQL('').valid).toBe(false);
                expect(validateSQL('   ').valid).toBe(false);
            });

            it('should reject SQL with only comments', () => {
                const result = validateSQL('-- This is a comment');
                expect(result.valid).toBe(false);
            });

            it('should allow SELECT with UPDATE_TIME column', () => {
                // UPDATE_TIME 是列名，不应该被误判为 UPDATE 操作
                const result = validateSQL('SELECT UPDATE_TIME FROM users');
                expect(result.valid).toBe(true);
            });
        });
    });

    describe('escapeIdentifier', () => {
        it('should escape MySQL identifiers with backticks', () => {
            expect(escapeIdentifier('users', 'mysql')).toBe('`users`');
            expect(escapeIdentifier('user_name', 'mysql')).toBe('`user_name`');
        });

        it('should escape PostgreSQL identifiers with double quotes', () => {
            expect(escapeIdentifier('users', 'postgresql')).toBe('"users"');
            expect(escapeIdentifier('user_name', 'postgresql')).toBe('"user_name"');
        });

        it('should escape SQLite identifiers with double quotes', () => {
            expect(escapeIdentifier('users', 'sqlite')).toBe('"users"');
            expect(escapeIdentifier('user_name', 'sqlite')).toBe('"user_name"');
        });

        it('should throw error for invalid identifiers', () => {
            expect(() => escapeIdentifier('users; DROP', 'mysql')).toThrow();
            expect(() => escapeIdentifier('users--', 'postgresql')).toThrow();
        });
    });

    describe('buildUpdateStatement', () => {
        it('should build MySQL UPDATE statement', () => {
            const result = buildUpdateStatement('users', 'name', 'id', 'mysql');
            expect(result.sql).toBe('UPDATE `users` SET `name` = ? WHERE `id` = ?');
            expect(result.paramStyle).toBe('question');
        });

        it('should build PostgreSQL UPDATE statement', () => {
            const result = buildUpdateStatement('users', 'name', 'id', 'postgresql');
            expect(result.sql).toBe('UPDATE "users" SET "name" = $1 WHERE "id" = $2');
            expect(result.paramStyle).toBe('dollar');
        });

        it('should build SQLite UPDATE statement', () => {
            const result = buildUpdateStatement('users', 'name', 'id', 'sqlite');
            expect(result.sql).toBe('UPDATE "users" SET "name" = ? WHERE "id" = ?');
            expect(result.paramStyle).toBe('question');
        });

        it('should throw error for invalid identifiers', () => {
            expect(() => buildUpdateStatement('users; DROP', 'name', 'id', 'mysql')).toThrow();
            expect(() => buildUpdateStatement('users', 'name--', 'id', 'mysql')).toThrow();
            expect(() => buildUpdateStatement('users', 'name', 'id; DROP', 'mysql')).toThrow();
        });
    });

    describe('checkQueryLimit', () => {
        it('should accept queries with reasonable LIMIT', () => {
            expect(checkQueryLimit('SELECT * FROM users LIMIT 100').valid).toBe(true);
            expect(checkQueryLimit('SELECT * FROM users LIMIT 1000').valid).toBe(true);
        });

        it('should reject queries with excessive LIMIT', () => {
            const result = checkQueryLimit('SELECT * FROM users LIMIT 20000', 10000);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('超过限制');
        });

        it('should accept queries without LIMIT', () => {
            // 允许但会有警告
            const result = checkQueryLimit('SELECT * FROM users');
            expect(result.valid).toBe(true);
        });

        it('should accept COUNT queries without LIMIT', () => {
            const result = checkQueryLimit('SELECT COUNT(*) FROM users');
            expect(result.valid).toBe(true);
        });
    });
});
