/**
 * 工具导航组件
 * 支持分类筛选和搜索
 */

import { toolRegistry } from '../core/ToolRegistry';
import { ToolCategory, type ToolConfig } from '../types/index';
import { eventBus } from '../core/EventBus';
import { EventType } from '../types/index';

/** 分类显示名称 */
const CATEGORY_LABELS: Record<ToolCategory, string> = {
  [ToolCategory.UTILITY]: '实用工具',
  [ToolCategory.DEVELOPER]: '开发工具',
  [ToolCategory.CONVERTER]: '转换工具',
  [ToolCategory.NETWORK]: '网络工具',
  [ToolCategory.TERMINAL]: '终端工具',
};

/** 分类图标 */
const CATEGORY_ICONS: Record<ToolCategory, string> = {
  [ToolCategory.UTILITY]: '🛠️',
  [ToolCategory.DEVELOPER]: '💻',
  [ToolCategory.CONVERTER]: '🔄',
  [ToolCategory.NETWORK]: '🌐',
  [ToolCategory.TERMINAL]: '🖥️',
};

class ToolNav {
  private container: HTMLElement | null = null;
  private currentCategory: ToolCategory | 'all' = 'all';
  private currentKey: string | null = null;
  private searchQuery = '';

  /**
   * 初始化导航
   */
  init(container: HTMLElement): void {
    this.container = container;
    this.render();
    this.bindEvents();
  }

  /**
   * 渲染导航
   */
  private render(): void {
    if (!this.container) return;

    const configs = toolRegistry.getAllConfigs();
    const filteredConfigs = this.filterConfigs(configs);

    this.container.innerHTML = `
      <div class="tool-nav">
        <div class="tool-nav-categories">
          <button class="tool-nav-cat ${this.currentCategory === 'all' ? 'active' : ''}" data-category="all">
            全部
          </button>
          ${Object.values(ToolCategory)
            .map(
              (cat) => `
            <button class="tool-nav-cat ${this.currentCategory === cat ? 'active' : ''}" data-category="${cat}">
              ${CATEGORY_ICONS[cat]} ${CATEGORY_LABELS[cat]}
            </button>
          `
            )
            .join('')}
        </div>
        <div class="tool-nav-search">
          <input type="text" placeholder="搜索工具..." value="${this.searchQuery}" class="tool-nav-search-input" />
        </div>
        <div class="tool-nav-list">
          ${filteredConfigs
            .map(
              (config) => `
            <div class="tool-nav-item ${this.currentKey === config.key ? 'active' : ''}" data-key="${config.key}">
              <span class="tool-nav-icon">${config.icon || '🔧'}</span>
              <span class="tool-nav-title">${config.title}</span>
            </div>
          `
            )
            .join('')}
        </div>
      </div>
    `;
  }

  /**
   * 过滤配置
   */
  private filterConfigs(configs: ToolConfig[]): ToolConfig[] {
    let filtered = configs;

    // 按分类过滤
    if (this.currentCategory !== 'all') {
      filtered = filtered.filter((c) => c.category === this.currentCategory);
    }

    // 按搜索词过滤
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.title.toLowerCase().includes(query) ||
          c.key.toLowerCase().includes(query) ||
          c.description?.toLowerCase().includes(query) ||
          c.keywords?.some((k) => k.toLowerCase().includes(query))
      );
    }

    return filtered;
  }

  /**
   * 绑定事件
   */
  private bindEvents(): void {
    if (!this.container) return;

    // 分类切换
    this.container.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const catBtn = target.closest('.tool-nav-cat') as HTMLElement;
      if (catBtn) {
        const category = catBtn.dataset.category as ToolCategory | 'all';
        this.setCategory(category);
      }

      const item = target.closest('.tool-nav-item') as HTMLElement;
      if (item) {
        const key = item.dataset.key;
        if (key) {
          this.selectTool(key);
        }
      }
    });

    // 搜索
    const searchInput = this.container.querySelector('.tool-nav-search-input') as HTMLInputElement;
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = (e.target as HTMLInputElement).value;
        this.render();
        this.bindEvents();
      });
    }
  }

  /**
   * 设置分类
   */
  setCategory(category: ToolCategory | 'all'): void {
    this.currentCategory = category;
    this.render();
    this.bindEvents();
  }

  /**
   * 选择工具
   */
  selectTool(key: string): void {
    this.currentKey = key;

    // 触发工具切换事件
    eventBus.emit(EventType.TOOL_CHANGE, { key });

    // 调用旧架构的 switchSite（如果存在）
    if (typeof (window as any).switchSite === 'function') {
      (window as any).switchSite(key);
    }

    this.render();
    this.bindEvents();
  }

  /**
   * 获取当前选中的工具 key
   */
  getCurrentKey(): string | null {
    return this.currentKey;
  }
}

export const toolNav = new ToolNav();
