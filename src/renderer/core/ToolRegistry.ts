/**
 * 工具注册表
 * 管理所有工具的注册和实例化
 */

import type { ITool, ToolConfig, ToolConstructor } from '../types/index';

class ToolRegistry {
  private tools: Map<string, ToolConstructor> = new Map();
  private instances: Map<string, ITool> = new Map();

  /**
   * 注册单个工具
   */
  register(ToolClass: ToolConstructor): void {
    const config = ToolClass.config;
    if (this.tools.has(config.key)) {
      console.warn(`[ToolRegistry] Tool "${config.key}" already registered, skipping`);
      return;
    }
    this.tools.set(config.key, ToolClass);
    console.log(`[ToolRegistry] Registered tool: ${config.key}`);
  }

  /**
   * 批量注册工具
   */
  registerAll(toolClasses: ToolConstructor[]): void {
    toolClasses.forEach((ToolClass) => this.register(ToolClass));
  }

  /**
   * 获取工具实例（单例）
   */
  getInstance(key: string): ITool | null {
    // 已有实例直接返回
    if (this.instances.has(key)) {
      return this.instances.get(key)!;
    }

    // 创建新实例
    const ToolClass = this.tools.get(key);
    if (!ToolClass) {
      console.warn(`[ToolRegistry] Tool "${key}" not found`);
      return null;
    }

    const instance = new ToolClass();
    this.instances.set(key, instance);
    return instance;
  }

  /**
   * 检查工具是否已注册
   */
  has(key: string): boolean {
    return this.tools.has(key);
  }

  /**
   * 获取所有工具配置
   */
  getAllConfigs(): ToolConfig[] {
    return Array.from(this.tools.values()).map((ToolClass) => ToolClass.config);
  }

  /**
   * 获取已注册工具数量
   */
  get size(): number {
    return this.tools.size;
  }

  /**
   * 销毁所有工具实例
   */
  destroyAll(): void {
    this.instances.forEach((instance) => instance.destroy());
    this.instances.clear();
  }
}

export const toolRegistry = new ToolRegistry();
