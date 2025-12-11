/**
 * 懒加载管理器
 * 提供驱动和模块的按需加载功能
 */

export interface LazyModule<T> {
    loaded: boolean;
    loading: boolean;
    module: T | null;
    error: string | null;
    loadTime: number;
}

type LoaderFunction<T> = () => Promise<T>;

export class LazyLoader {
    private modules: Map<string, LazyModule<any>> = new Map();
    private loaders: Map<string, LoaderFunction<any>> = new Map();
    private loadPromises: Map<string, Promise<any>> = new Map();

    /**
     * 注册一个懒加载模块
     */
    register<T>(name: string, loader: LoaderFunction<T>): void {
        this.loaders.set(name, loader);
        this.modules.set(name, {
            loaded: false,
            loading: false,
            module: null,
            error: null,
            loadTime: 0,
        });
    }

    /**
     * 获取模块（按需加载）
     */
    async get<T>(name: string): Promise<T | null> {
        const moduleInfo = this.modules.get(name);
        
        if (!moduleInfo) {
            console.warn(`[LazyLoader] Module "${name}" not registered`);
            return null;
        }

        // 已加载
        if (moduleInfo.loaded) {
            return moduleInfo.module;
        }

        // 正在加载，等待
        if (moduleInfo.loading) {
            const existingPromise = this.loadPromises.get(name);
            if (existingPromise) {
                return existingPromise;
            }
        }

        // 开始加载
        return this.load<T>(name);
    }

    /**
     * 加载模块
     */
    private async load<T>(name: string): Promise<T | null> {
        const moduleInfo = this.modules.get(name);
        const loader = this.loaders.get(name);

        if (!moduleInfo || !loader) {
            return null;
        }

        moduleInfo.loading = true;
        const startTime = performance.now();

        const loadPromise = (async () => {
            try {
                const module = await loader();
                moduleInfo.module = module;
                moduleInfo.loaded = true;
                moduleInfo.error = null;
                moduleInfo.loadTime = performance.now() - startTime;
                console.log(`[LazyLoader] Loaded "${name}" in ${moduleInfo.loadTime.toFixed(2)}ms`);
                return module;
            } catch (e) {
                moduleInfo.error = e instanceof Error ? e.message : String(e);
                console.error(`[LazyLoader] Failed to load "${name}":`, moduleInfo.error);
                return null;
            } finally {
                moduleInfo.loading = false;
                this.loadPromises.delete(name);
            }
        })();

        this.loadPromises.set(name, loadPromise);
        return loadPromise;
    }

    /**
     * 预加载模块（后台加载，不阻塞）
     */
    preload(names: string[]): void {
        for (const name of names) {
            const moduleInfo = this.modules.get(name);
            if (moduleInfo && !moduleInfo.loaded && !moduleInfo.loading) {
                this.get(name).catch(() => {}); // 忽略预加载错误
            }
        }
    }

    /**
     * 检查模块是否已加载
     */
    isLoaded(name: string): boolean {
        return this.modules.get(name)?.loaded ?? false;
    }

    /**
     * 检查模块是否正在加载
     */
    isLoading(name: string): boolean {
        return this.modules.get(name)?.loading ?? false;
    }

    /**
     * 获取模块状态
     */
    getStatus(name: string): LazyModule<any> | undefined {
        return this.modules.get(name);
    }

    /**
     * 获取所有模块状态
     */
    getAllStatus(): Record<string, LazyModule<any>> {
        const result: Record<string, LazyModule<any>> = {};
        for (const [name, info] of this.modules) {
            result[name] = { ...info };
        }
        return result;
    }

    /**
     * 卸载模块
     */
    unload(name: string): boolean {
        const moduleInfo = this.modules.get(name);
        if (!moduleInfo) return false;

        moduleInfo.loaded = false;
        moduleInfo.module = null;
        moduleInfo.error = null;
        moduleInfo.loadTime = 0;
        return true;
    }

    /**
     * 重新加载模块
     */
    async reload<T>(name: string): Promise<T | null> {
        this.unload(name);
        return this.get<T>(name);
    }

    /**
     * 获取加载统计
     */
    getStats() {
        let loaded = 0;
        let failed = 0;
        let totalLoadTime = 0;

        for (const info of this.modules.values()) {
            if (info.loaded) {
                loaded++;
                totalLoadTime += info.loadTime;
            }
            if (info.error) {
                failed++;
            }
        }

        return {
            total: this.modules.size,
            loaded,
            failed,
            pending: this.modules.size - loaded - failed,
            totalLoadTime: totalLoadTime.toFixed(2) + 'ms',
            avgLoadTime: loaded > 0 ? (totalLoadTime / loaded).toFixed(2) + 'ms' : '0ms',
        };
    }
}

// 创建全局懒加载器实例
export const driverLoader = new LazyLoader();

// 注册数据库驱动
driverLoader.register('mysql2', async () => {
    const mysql = await import('mysql2/promise');
    return mysql;
});

driverLoader.register('pg', async () => {
    const pg = await import('pg');
    return pg;
});

driverLoader.register('better-sqlite3', async () => {
    const sqlite = await import('better-sqlite3');
    return sqlite.default;
});

driverLoader.register('ioredis', async () => {
    const Redis = (await import('ioredis')).default;
    return Redis;
});

driverLoader.register('mongodb', async () => {
    const mongodb = await import('mongodb');
    return mongodb;
});
