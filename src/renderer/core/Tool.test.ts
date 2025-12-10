import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Tool } from './Tool';
import type { ToolConfig } from '../types/index';

/**
 * 测试用的具体工具类
 */
class TestTool extends Tool {
    static readonly config: ToolConfig = {
        key: 'test-tool',
        title: 'Test Tool',
        category: 'utility' as any,
        icon: '🧪',
    };

    config: ToolConfig = TestTool.config;

    render(): HTMLElement {
        const div = document.createElement('div');
        div.className = 'test-tool-content';
        div.innerHTML = '<p>Test Tool Content</p>';
        return div;
    }

    // 暴露 protected 方法供测试
    public testBindEvents(): void {
        this.bindEvents();
    }

    public testCleanupEvents(): void {
        this.cleanupEvents();
    }

    public getCleanupFnsCount(): number {
        return this.cleanupFns.length;
    }
}

describe('Tool', () => {
    let container: HTMLElement;
    let tool: TestTool;

    beforeEach(() => {
        // 创建测试容器
        container = document.createElement('div');
        container.id = 'test-container';
        document.body.appendChild(container);

        // 创建工具实例
        tool = new TestTool();
    });

    describe('生命周期', () => {
        it('should mount correctly', () => {
            expect(tool.mounted).toBe(false);

            tool.mount(container);

            expect(tool.mounted).toBe(true);
            expect(container.children.length).toBe(1);
            
            const element = container.querySelector('.tool-view');
            expect(element).toBeTruthy();
            expect(element?.classList.contains('test-tool-view')).toBe(true);
            expect(element?.getAttribute('data-key')).toBe('test-tool');
        });

        it('should not mount twice', () => {
            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            
            tool.mount(container);
            tool.mount(container);

            expect(consoleSpy).toHaveBeenCalledWith('[test-tool] Tool already mounted');
            expect(container.children.length).toBe(1);
            
            consoleSpy.mockRestore();
        });

        it('should unmount correctly', () => {
            tool.mount(container);
            expect(tool.mounted).toBe(true);

            tool.unmount();

            expect(tool.mounted).toBe(false);
            expect(container.querySelector('.test-tool-view')).toBeNull();
        });

        it('should handle unmount when not mounted', () => {
            expect(() => tool.unmount()).not.toThrow();
            expect(tool.mounted).toBe(false);
        });
    });

    describe('激活/失活', () => {
        beforeEach(() => {
            tool.mount(container);
        });

        it('should activate correctly', () => {
            tool.activate();

            const element = container.querySelector('.test-tool-view') as HTMLElement;
            expect(element.classList.contains('active')).toBe(true);
            expect(element.style.display).toBe('');
        });

        it('should deactivate correctly', () => {
            tool.activate();
            tool.deactivate();

            const element = container.querySelector('.test-tool-view') as HTMLElement;
            expect(element.classList.contains('active')).toBe(false);
            expect(element.style.display).toBe('none');
        });

        it('should not activate unmounted tool', () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            tool.unmount();

            tool.activate();

            expect(consoleSpy).toHaveBeenCalledWith('[test-tool] Cannot activate unmounted tool');
            consoleSpy.mockRestore();
        });

        it('should not activate twice', () => {
            tool.activate();
            const element = container.querySelector('.test-tool-view') as HTMLElement;
            const classList = element.classList;
            const classCount = classList.length;

            tool.activate();

            expect(classList.length).toBe(classCount);
        });

        it('should unmount active tool', () => {
            tool.activate();
            expect(() => tool.unmount()).not.toThrow();
            expect(tool.mounted).toBe(false);
        });
    });

    describe('事件管理', () => {
        beforeEach(() => {
            tool.mount(container);
        });

        it('should register event listeners', () => {
            const button = document.createElement('button');
            container.appendChild(button);

            let clicked = false;
            const handler = () => { clicked = true; };

            // @ts-ignore - 测试 protected 方法
            tool.addEventListener(button, 'click', handler);

            button.click();
            expect(clicked).toBe(true);
            expect(tool.getCleanupFnsCount()).toBe(1);
        });

        it('should cleanup event listeners', () => {
            const button = document.createElement('button');
            container.appendChild(button);

            let clickCount = 0;
            const handler = () => { clickCount++; };

            // @ts-ignore
            tool.addEventListener(button, 'click', handler);
            
            button.click();
            expect(clickCount).toBe(1);

            tool.testCleanupEvents();
            
            button.click();
            expect(clickCount).toBe(1); // 应该还是 1，因为监听器已清理
            expect(tool.getCleanupFnsCount()).toBe(0);
        });

        it('should cleanup events on unmount', () => {
            const button = document.createElement('button');
            const element = container.querySelector('.test-tool-view');
            element?.appendChild(button);

            let clickCount = 0;
            // @ts-ignore
            tool.addEventListener(button, 'click', () => { clickCount++; });

            button.click();
            expect(clickCount).toBe(1);

            tool.unmount();

            button.click();
            expect(clickCount).toBe(1);
        });

        it('should handle null element in addEventListener', () => {
            // @ts-ignore
            expect(() => tool.addEventListener(null, 'click', () => {})).not.toThrow();
        });
    });

    describe('DOM 查询', () => {
        beforeEach(() => {
            tool.mount(container);
        });

        it('should query elements within tool container', () => {
            const element = container.querySelector('.test-tool-view');
            const testElement = document.createElement('div');
            testElement.className = 'query-test';
            element?.appendChild(testElement);

            // @ts-ignore
            const result = tool.querySelector('.query-test');
            expect(result).toBe(testElement);
        });

        it('should return null when element not found', () => {
            // @ts-ignore
            const result = tool.querySelector('.non-existent');
            expect(result).toBeNull();
        });

        it('should return null when not mounted', () => {
            tool.unmount();
            // @ts-ignore
            const result = tool.querySelector('.test');
            expect(result).toBeNull();
        });

        it('should query all elements', () => {
            const element = container.querySelector('.test-tool-view');
            const item1 = document.createElement('div');
            const item2 = document.createElement('div');
            item1.className = 'query-item';
            item2.className = 'query-item';
            element?.appendChild(item1);
            element?.appendChild(item2);

            // @ts-ignore
            const results = tool.querySelectorAll('.query-item');
            expect(results.length).toBe(2);
        });
    });

    describe('销毁', () => {
        it('should destroy mounted tool', () => {
            tool.mount(container);
            tool.destroy();

            expect(tool.mounted).toBe(false);
            expect(container.querySelector('.test-tool-view')).toBeNull();
        });

        it('should destroy unmounted tool', () => {
            expect(() => tool.destroy()).not.toThrow();
            expect(tool.mounted).toBe(false);
        });
    });

    describe('生命周期钩子', () => {
        it('should call onMounted hook', () => {
            const onMountedSpy = vi.spyOn(tool as any, 'onMounted');
            tool.mount(container);
            expect(onMountedSpy).toHaveBeenCalled();
        });

        it('should call onBeforeUnmount hook', () => {
            tool.mount(container);
            const onBeforeUnmountSpy = vi.spyOn(tool as any, 'onBeforeUnmount');
            tool.unmount();
            expect(onBeforeUnmountSpy).toHaveBeenCalled();
        });

        it('should call onActivated hook', () => {
            tool.mount(container);
            const onActivatedSpy = vi.spyOn(tool as any, 'onActivated');
            tool.activate();
            expect(onActivatedSpy).toHaveBeenCalled();
        });

        it('should call onDeactivated hook', () => {
            tool.mount(container);
            tool.activate();
            const onDeactivatedSpy = vi.spyOn(tool as any, 'onDeactivated');
            tool.deactivate();
            expect(onDeactivatedSpy).toHaveBeenCalled();
        });

        it('should call onDestroy hook', () => {
            const onDestroySpy = vi.spyOn(tool as any, 'onDestroy');
            tool.destroy();
            expect(onDestroySpy).toHaveBeenCalled();
        });
    });
});
