/**
 * 应用主入口（新架构）
 */

import { toolRegistry } from './core/ToolRegistry';
import { eventBus } from './core/EventBus';
import { themeManager } from './core/ThemeManager';
import { favoriteManager } from './core/FavoriteManager';
import { EventType } from './types/index';
import { tools } from './tools/index';
import { Toast, toast } from './components/Toast';
import { searchPanel } from './components/SearchPanel';
import type { ToolConfig } from './types/index';

/** 工具快捷键映射 */
const TOOL_SHORTCUTS: Record<string, string> = {
  '1': 'time',
  '2': 'pwd',
  '3': 'text',
  '4': 'calc',
  '5': 'json',
  '6': 'codec',
  '7': 'crypto',
  '8': 'dns',
  '9': 'curl',
  '0': 'color',
};

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

    // 3. 初始化搜索面板
    searchPanel.init();

    // 4. 初始化主题（已在 ThemeManager 构造函数中完成）
    console.log(`[App] Theme: ${themeManager.getResolvedTheme()}`);

    // 5. 监听事件
    this.setupEventListeners();

    // 6. 设置快捷键
    this.setupKeyboardShortcuts();

    // 7. 获取主容器
    this.container = document.querySelector('main');

    // 8. 暴露到全局
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

    eventBus.on(EventType.FAVORITE_CHANGE, (data) => {
      const action = data.action === 'add' ? '已收藏' : '已取消收藏';
      const tool = toolRegistry.getInstance(data.key);
      if (tool) {
        toast({ message: `${tool.config.title} ${action}`, duration: 1500 });
      }
    });
  }

  /**
   * 设置键盘快捷键
   */
  private setupKeyboardShortcuts(): void {
    document.addEventListener('keydown', (e) => {
      // Cmd/Ctrl + 数字键 切换工具
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
        const toolKey = TOOL_SHORTCUTS[e.key];
        if (toolKey && toolRegistry.has(toolKey)) {
          e.preventDefault();
          if (typeof (window as any).switchSite === 'function') {
            (window as any).switchSite(toolKey);
          } else {
            this.switchTool(toolKey);
          }
          toast({ message: `切换到 ${toolRegistry.getInstance(toolKey)?.config.title}`, duration: 1500 });
        }
      }

      // Cmd/Ctrl + Shift + D 切换主题
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'd') {
        e.preventDefault();
        themeManager.toggle();
        toast({ message: `已切换到${themeManager.getResolvedTheme() === 'dark' ? '深色' : '浅色'}主题`, duration: 1500 });
      }

      // Cmd/Ctrl + D 收藏当前工具
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === 'd' && this.currentKey) {
        e.preventDefault();
        favoriteManager.toggle(this.currentKey);
      }
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
      toolRegistry,
      eventBus,
      toast,
      themeManager,
      favoriteManager,
    };
  }

  getToolConfigs(): ToolConfig[] {
    return toolRegistry.getAllConfigs();
  }
}

export const app = new App();
