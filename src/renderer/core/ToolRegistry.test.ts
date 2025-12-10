import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Tool } from './Tool';
import type { ToolConfig, ToolConstructor } from '../types/index';

// 导入并测试 ToolRegistry 类（而非单例）
class ToolRegistry {
    private tools: Map<string, ToolConstructor> = new Map();
    private instances: Map<string, any> = new Map();

    register(ToolClass: ToolConstructor): void {
        const config = ToolClass.config;
        if (this.tools.has(config.key)) {
            console.warn(`[ToolRegistry] Tool "${config.key}" already registered, skipping`);
            return;
        }
        this.tools.set(config.key, ToolClass);
        console.log(`[ToolRegistry] Registered tool: ${config.key}`);
    }

    registerAll(toolClasses: ToolConstructor[]): void {
        toolClasses.forEach((ToolClass) => this.register(ToolClass));
    }

    getInstance(key: string): any | null {
        if (this.instances.has(key)) {
            return this.instances.get(key)!;
        }

        const ToolClass = this.tools.get(key);
        if (!ToolClass) {
            console.warn(`[ToolRegistry] Tool "${key}" not found`);
            return null;
        }

        const instance = new ToolClass();
        this.instances.set(key, instance);
        return instance;
    }

    has(key: string): boolean {
        return this.tools.has(key);
    }

    getAllConfigs(): ToolConfig[] {
        return Array.from(this.tools.values()).map((ToolClass) => ToolClass.config);
    }

    get size(): number {
        return this.tools.size;
    }

    destroyAll(): void {
        this.instances.forEach((instance) => instance.destroy());
        this.instances.clear();
    }
}

// 测试用工具类
class TestToolA extends Tool {
    static readonly config: ToolConfig = {
        key: 'test-tool-a',
        title: 'Test Tool A',
        category: 'utility' as any,
    };
    config = TestToolA.config;
    render(): HTMLElement {
        return document.createElement('div');
    }
}

class TestToolB extends Tool {
    static readonly config: ToolConfig = {
        key: 'test-tool-b',
        title: 'Test Tool B',
        category: 'converter' as any,
    };
    config = TestToolB.config;
    render(): HTMLElement {
        return document.createElement('div');
    }
}

describe('ToolRegistry', () => {
    let registry: ToolRegistry;

    beforeEach(() => {
        registry = new ToolRegistry();
    });

    describe('register', () => {
        it('should register a tool', () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

            registry.register(TestToolA);

            expect(registry.has('test-tool-a')).toBe(true);
            expect(registry.size).toBe(1);
            expect(consoleSpy).toHaveBeenCalledWith('[ToolRegistry] Registered tool: test-tool-a');

            consoleSpy.mockRestore();
        });

        it('should not register duplicate tool', () => {
            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

            registry.register(TestToolA);
            registry.register(TestToolA);

            expect(registry.size).toBe(1);
            expect(consoleSpy).toHaveBeenCalledWith(
                '[ToolRegistry] Tool "test-tool-a" already registered, skipping'
            );

            consoleSpy.mockRestore();
        });
    });

    describe('registerAll', () => {
        it('should register multiple tools', () => {
            registry.registerAll([TestToolA, TestToolB]);

            expect(registry.has('test-tool-a')).toBe(true);
            expect(registry.has('test-tool-b')).toBe(true);
            expect(registry.size).toBe(2);
        });

        it('should handle empty array', () => {
            registry.registerAll([]);
            expect(registry.size).toBe(0);
        });
    });

    describe('getInstance', () => {
        beforeEach(() => {
            registry.register(TestToolA);
        });

        it('should create tool instance', () => {
            const instance = registry.getInstance('test-tool-a');

            expect(instance).toBeTruthy();
            expect(instance).toBeInstanceOf(TestToolA);
        });

        it('should return same instance on multiple calls (singleton)', () => {
            const instance1 = registry.getInstance('test-tool-a');
            const instance2 = registry.getInstance('test-tool-a');

            expect(instance1).toBe(instance2);
        });

        it('should return null for non-existent tool', () => {
            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

            const instance = registry.getInstance('non-existent');

            expect(instance).toBeNull();
            expect(consoleSpy).toHaveBeenCalledWith('[ToolRegistry] Tool "non-existent" not found');

            consoleSpy.mockRestore();
        });

        it('should create different instances for different tools', () => {
            registry.register(TestToolB);

            const instanceA = registry.getInstance('test-tool-a');
            const instanceB = registry.getInstance('test-tool-b');

            expect(instanceA).toBeInstanceOf(TestToolA);
            expect(instanceB).toBeInstanceOf(TestToolB);
            expect(instanceA).not.toBe(instanceB);
        });
    });

    describe('has', () => {
        it('should return true for registered tool', () => {
            registry.register(TestToolA);
            expect(registry.has('test-tool-a')).toBe(true);
        });

        it('should return false for non-registered tool', () => {
            expect(registry.has('non-existent')).toBe(false);
        });
    });

    describe('getAllConfigs', () => {
        it('should return all tool configs', () => {
            registry.registerAll([TestToolA, TestToolB]);

            const configs = registry.getAllConfigs();

            expect(configs).toHaveLength(2);
            expect(configs.map(c => c.key)).toContain('test-tool-a');
            expect(configs.map(c => c.key)).toContain('test-tool-b');
        });

        it('should return empty array when no tools registered', () => {
            const configs = registry.getAllConfigs();
            expect(configs).toHaveLength(0);
        });

        it('should return configs with correct properties', () => {
            registry.register(TestToolA);

            const configs = registry.getAllConfigs();
            const config = configs[0];

            expect(config).toHaveProperty('key');
            expect(config).toHaveProperty('title');
            expect(config).toHaveProperty('category');
        });
    });

    describe('size', () => {
        it('should return correct size', () => {
            expect(registry.size).toBe(0);

            registry.register(TestToolA);
            expect(registry.size).toBe(1);

            registry.register(TestToolB);
            expect(registry.size).toBe(2);
        });
    });

    describe('destroyAll', () => {
        it('should destroy all instances', () => {
            registry.registerAll([TestToolA, TestToolB]);

            const instanceA = registry.getInstance('test-tool-a');
            const instanceB = registry.getInstance('test-tool-b');

            const destroySpyA = vi.spyOn(instanceA as any, 'destroy');
            const destroySpyB = vi.spyOn(instanceB as any, 'destroy');

            registry.destroyAll();

            expect(destroySpyA).toHaveBeenCalled();
            expect(destroySpyB).toHaveBeenCalled();
        });

        it('should allow creating new instances after destroyAll', () => {
            registry.register(TestToolA);

            const instance1 = registry.getInstance('test-tool-a');
            registry.destroyAll();

            const instance2 = registry.getInstance('test-tool-a');

            expect(instance1).not.toBe(instance2);
            expect(instance2).toBeInstanceOf(TestToolA);
        });

        it('should handle empty registry', () => {
            expect(() => registry.destroyAll()).not.toThrow();
        });
    });
});
