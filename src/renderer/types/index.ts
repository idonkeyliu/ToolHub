/**
 * 类型定义
 */

/** 工具分类 */
export enum ToolCategory {
  UTILITY = 'utility',
  DEVELOPER = 'developer',
  CONVERTER = 'converter',
  NETWORK = 'network',
  TERMINAL = 'terminal',
}

/** 工具配置 */
export interface ToolConfig {
  key: string;
  title: string;
  category: ToolCategory;
  icon?: string;
  description?: string;
  keywords?: string[];
}

/** 工具接口 */
export interface ITool {
  config: ToolConfig;
  mounted: boolean;
  render(): HTMLElement;
  mount(container: HTMLElement): void;
  unmount(): void;
  activate(): void;
  deactivate(): void;
  destroy(): void;
}

/** 工具类构造器 */
export interface ToolConstructor {
  new (): ITool;
  readonly config: ToolConfig;
}

/** 站点配置（旧代码兼容） */
export interface SiteConfig {
  key: string;
  title: string;
  url?: string;
  partition?: string;
  icon?: string;
}

/** 事件类型 */
export enum EventType {
  TOOL_CHANGE = 'tool:change',
  TOAST_SHOW = 'toast:show',
  TOAST_HIDE = 'toast:hide',
  FAVORITE_CHANGE = 'favorite:change',
  THEME_CHANGE = 'theme:change',
}

/** Toast 数据 */
export interface ToastData {
  message: string;
  duration?: number;
  type?: 'info' | 'success' | 'error' | 'warning';
}
