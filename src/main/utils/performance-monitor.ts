/**
 * 性能监控模块
 * 提供性能指标收集和分析
 */

export interface PerformanceMetric {
    name: string;
    duration: number;
    timestamp: number;
    metadata?: Record<string, any>;
}

export interface PerformanceStats {
    count: number;
    totalTime: number;
    avgTime: number;
    minTime: number;
    maxTime: number;
    p50: number;
    p95: number;
    p99: number;
}

class PerformanceMonitor {
    private metrics: Map<string, PerformanceMetric[]> = new Map();
    private maxMetricsPerKey = 1000;
    private enabled = true;

    /**
     * 开始计时
     */
    startTimer(name: string): (metadata?: Record<string, any>) => void {
        if (!this.enabled) {
            return () => {};
        }

        const startTime = performance.now();
        return (metadata?: Record<string, any>) => {
            const duration = performance.now() - startTime;
            this.record(name, duration, metadata);
        };
    }

    /**
     * 记录性能指标
     */
    record(name: string, duration: number, metadata?: Record<string, any>): void {
        if (!this.enabled) return;

        if (!this.metrics.has(name)) {
            this.metrics.set(name, []);
        }

        const metrics = this.metrics.get(name)!;
        metrics.push({
            name,
            duration,
            timestamp: Date.now(),
            metadata,
        });

        // 保持最大数量
        if (metrics.length > this.maxMetricsPerKey) {
            metrics.shift();
        }
    }

    /**
     * 测量异步函数执行时间
     */
    async measure<T>(name: string, fn: () => Promise<T>, metadata?: Record<string, any>): Promise<T> {
        const stopTimer = this.startTimer(name);
        try {
            const result = await fn();
            stopTimer(metadata);
            return result;
        } catch (e) {
            stopTimer({ ...metadata, error: true });
            throw e;
        }
    }

    /**
     * 测量同步函数执行时间
     */
    measureSync<T>(name: string, fn: () => T, metadata?: Record<string, any>): T {
        const stopTimer = this.startTimer(name);
        try {
            const result = fn();
            stopTimer(metadata);
            return result;
        } catch (e) {
            stopTimer({ ...metadata, error: true });
            throw e;
        }
    }

    /**
     * 获取统计信息
     */
    getStats(name: string): PerformanceStats | null {
        const metrics = this.metrics.get(name);
        if (!metrics || metrics.length === 0) {
            return null;
        }

        const durations = metrics.map(m => m.duration).sort((a, b) => a - b);
        const count = durations.length;
        const totalTime = durations.reduce((sum, d) => sum + d, 0);

        return {
            count,
            totalTime,
            avgTime: totalTime / count,
            minTime: durations[0],
            maxTime: durations[count - 1],
            p50: this.percentile(durations, 50),
            p95: this.percentile(durations, 95),
            p99: this.percentile(durations, 99),
        };
    }

    /**
     * 获取所有统计信息
     */
    getAllStats(): Record<string, PerformanceStats> {
        const result: Record<string, PerformanceStats> = {};
        for (const name of this.metrics.keys()) {
            const stats = this.getStats(name);
            if (stats) {
                result[name] = stats;
            }
        }
        return result;
    }

    /**
     * 获取最近的指标
     */
    getRecentMetrics(name: string, count: number = 10): PerformanceMetric[] {
        const metrics = this.metrics.get(name);
        if (!metrics) return [];
        return metrics.slice(-count);
    }

    /**
     * 清除指标
     */
    clear(name?: string): void {
        if (name) {
            this.metrics.delete(name);
        } else {
            this.metrics.clear();
        }
    }

    /**
     * 启用/禁用监控
     */
    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }

    /**
     * 检查是否启用
     */
    isEnabled(): boolean {
        return this.enabled;
    }

    /**
     * 计算百分位数
     */
    private percentile(sortedArray: number[], p: number): number {
        if (sortedArray.length === 0) return 0;
        const index = Math.ceil((p / 100) * sortedArray.length) - 1;
        return sortedArray[Math.max(0, index)];
    }

    /**
     * 格式化统计信息
     */
    formatStats(name: string): string {
        const stats = this.getStats(name);
        if (!stats) return `No metrics for "${name}"`;

        return [
            `📊 ${name}`,
            `  Count: ${stats.count}`,
            `  Avg: ${stats.avgTime.toFixed(2)}ms`,
            `  Min: ${stats.minTime.toFixed(2)}ms`,
            `  Max: ${stats.maxTime.toFixed(2)}ms`,
            `  P50: ${stats.p50.toFixed(2)}ms`,
            `  P95: ${stats.p95.toFixed(2)}ms`,
            `  P99: ${stats.p99.toFixed(2)}ms`,
        ].join('\n');
    }

    /**
     * 打印所有统计信息
     */
    printAllStats(): void {
        console.log('\n========== Performance Report ==========');
        for (const name of this.metrics.keys()) {
            console.log(this.formatStats(name));
            console.log('');
        }
        console.log('=========================================\n');
    }

    /**
     * 导出指标数据
     */
    export(): Record<string, PerformanceMetric[]> {
        const result: Record<string, PerformanceMetric[]> = {};
        for (const [name, metrics] of this.metrics) {
            result[name] = [...metrics];
        }
        return result;
    }
}

// 全局性能监控实例
export const perfMonitor = new PerformanceMonitor();

// 便捷装饰器（用于类方法）
export function Measure(name?: string) {
    return function (
        target: any,
        propertyKey: string,
        descriptor: PropertyDescriptor
    ) {
        const originalMethod = descriptor.value;
        const metricName = name || `${target.constructor.name}.${propertyKey}`;

        descriptor.value = async function (...args: any[]) {
            return perfMonitor.measure(metricName, () => originalMethod.apply(this, args));
        };

        return descriptor;
    };
}
