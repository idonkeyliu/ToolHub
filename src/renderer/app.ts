/**
 * 应用主入口（新架构）
 */

import { toolRegistry } from './core/ToolRegistry';
import { eventBus } from './core/EventBus';
import { EventType } from './types/index';
import { tools } from './tools/index';
import { Toast, toast } from './components/Toast';
import type { ToolConfig } from './types/index';

export class App {
  private currentKey: string | null = null;
  private container: HTMLElement | null = null;

  constructor() {
    this.init();
  }

  private init(): void {
    console.log('[App] Initializing new architecture...');

    // 1. 注册所有工具
    toolRegistry.registerAll(tools);
    console.log(`[App] Registered ${toolRegistry.size} tools`);

    // 2. 初始化 Toast 组件
    Toast.getInstance();

    // 3. 监听事件
    this.setupEventListeners();

    // 4. 获取主容器
    this.container = document.querySelector('main');

    // 5. 暴露到全局
    this.exposeToGlobal();

    console.log('[App] Initialization complete');
  }

  private setupEventListeners(): void {
    eventBus.on(EventType.TOAST_SHOW, (data) => {
      toast(data);
    });

    eventBus.on(EventType.TOOL_CHANGE, (data) => {
      this.switchTool(data.key);
    });
  }

  /**
   * 切换工具
   */
  switchTool(key: string): void {
    if (!this.container) {
      console.error('[App] Container not found');
      return;
    }

    if (!toolRegistry.has(key)) {
      console.log(`[App] Tool "${key}" not in new architecture, skip`);
      return;
    }

    console.log(`[App] Switching to tool: ${key}`);

    // 失活当前工具
    if (this.currentKey && toolRegistry.has(this.currentKey)) {
      const currentTool = toolRegistry.getInstance(this.currentKey);
      currentTool?.deactivate();
    }

    // 获取或创建新工具
    const tool = toolRegistry.getInstance(key);
    if (!tool) {
      console.error(`[App] Failed to get tool instance: ${key}`);
      return;
    }

    // 挂载工具（如果还没挂载）
    const element = this.container.querySelector(`.${key}-view`);
    if (!element) {
      tool.mount(this.container);
      console.log(`[App] Tool "${key}" mounted`);
    }

    // 激活工具
    tool.activate();
    this.currentKey = key;

    console.log(`[App] Tool "${key}" activated`);
  }

  private exposeToGlobal(): void {
    (window as any).__newApp = {
      switchTool: (key: string) => this.switchTool(key),
      hasToolRegistry: toolRegistry,
      eventBus,
      toast,
    };
  }

  getToolConfigs(): ToolConfig[] {
    return toolRegistry.getAllConfigs();
  }
}

export const app = new App();
