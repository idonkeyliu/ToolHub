/**
 * 工具搜索面板
 * 快捷键 Cmd/Ctrl + K 打开
 */

import { toolRegistry } from '../core/ToolRegistry';
import { ToolCategory, type ToolConfig } from '../types/index';
import { i18n } from '../core/i18n';

/** 分类图标 */
const CATEGORY_ICONS: Record<ToolCategory, string> = {
  [ToolCategory.UTILITY]: '🛠️',
  [ToolCategory.DEVELOPER]: '💻',
  [ToolCategory.CONVERTER]: '🔄',
  [ToolCategory.NETWORK]: '🌐',
  [ToolCategory.TERMINAL]: '🖥️',
};

/** 分类显示名称 - 使用函数获取以支持动态语言切换 */
const getCategoryLabel = (cat: ToolCategory): string => {
  const labels: Record<ToolCategory, string> = {
    [ToolCategory.UTILITY]: i18n.t('toolCategory.utility'),
    [ToolCategory.DEVELOPER]: i18n.t('toolCategory.dev'),
    [ToolCategory.CONVERTER]: i18n.t('toolCategory.convert'),
    [ToolCategory.NETWORK]: i18n.t('toolCategory.network'),
    [ToolCategory.TERMINAL]: i18n.t('toolCategory.terminal'),
  };
  return labels[cat];
};

class SearchPanel {
  private overlay: HTMLElement | null = null;
  private panel: HTMLElement | null = null;
  private input: HTMLInputElement | null = null;
  private list: HTMLElement | null = null;
  private isOpen = false;
  private selectedIndex = 0;
  private filteredConfigs: ToolConfig[] = [];

  /**
   * 初始化搜索面板
   */
  init(): void {
    this.createDOM();
    this.bindEvents();
  }

  /**
   * 创建 DOM 结构
   */
  private createDOM(): void {
    // 创建遮罩层
    this.overlay = document.createElement('div');
    this.overlay.className = 'search-overlay';
    this.overlay.innerHTML = `
      <div class="search-panel">
        <div class="search-header">
          <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <input type="text" class="search-input" placeholder="${i18n.t('search.placeholder')}" autofocus />
          <kbd class="search-kbd">ESC</kbd>
        </div>
        <div class="search-list"></div>
        <div class="search-footer">
          <span><kbd>↑↓</kbd> ${i18n.t('search.navigate')}</span>
          <span><kbd>Enter</kbd> ${i18n.t('search.select')}</span>
          <span><kbd>ESC</kbd> ${i18n.t('search.close')}</span>
        </div>
      </div>
    `;

    document.body.appendChild(this.overlay);

    this.panel = this.overlay.querySelector('.search-panel');
    this.input = this.overlay.querySelector('.search-input');
    this.list = this.overlay.querySelector('.search-list');

    // 添加样式
    this.addStyles();
  }

  /**
   * 添加样式
   */
  private addStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .search-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(4px);
        display: none;
        align-items: flex-start;
        justify-content: center;
        padding-top: 15vh;
        z-index: 9999;
        animation: fadeIn 0.15s ease;
      }
      .search-overlay.open {
        display: flex;
      }
      .search-panel {
        width: 560px;
        max-width: 90vw;
        background: #1a1f2e;
        border: 1px solid #2a3441;
        border-radius: 12px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        overflow: hidden;
        animation: slideDown 0.2s ease;
      }
      @keyframes slideDown {
        from { opacity: 0; transform: translateY(-20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .search-header {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px;
        border-bottom: 1px solid #2a3441;
      }
      .search-icon {
        width: 20px;
        height: 20px;
        color: #6b7280;
        flex-shrink: 0;
      }
      .search-input {
        flex: 1;
        background: transparent;
        border: none;
        outline: none;
        font-size: 16px;
        color: #e5e7eb;
      }
      .search-input::placeholder {
        color: #6b7280;
      }
      .search-kbd {
        padding: 4px 8px;
        font-size: 11px;
        font-family: inherit;
        background: #2a3441;
        border-radius: 4px;
        color: #9ca3af;
      }
      .search-list {
        max-height: 400px;
        overflow-y: auto;
        padding: 8px;
      }
      .search-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        border-radius: 8px;
        cursor: pointer;
        transition: background 0.15s;
      }
      .search-item:hover,
      .search-item.selected {
        background: rgba(59, 130, 246, 0.15);
      }
      .search-item.selected {
        background: rgba(59, 130, 246, 0.25);
      }
      .search-item-icon {
        font-size: 20px;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #2a3441;
        border-radius: 8px;
      }
      .search-item-info {
        flex: 1;
      }
      .search-item-title {
        font-size: 14px;
        font-weight: 500;
        color: #e5e7eb;
      }
      .search-item-desc {
        font-size: 12px;
        color: #6b7280;
        margin-top: 2px;
      }
      .search-item-category {
        font-size: 11px;
        padding: 2px 8px;
        background: #2a3441;
        border-radius: 4px;
        color: #9ca3af;
      }
      .search-empty {
        padding: 40px;
        text-align: center;
        color: #6b7280;
      }
      .search-footer {
        display: flex;
        gap: 16px;
        padding: 12px 16px;
        border-top: 1px solid #2a3441;
        font-size: 12px;
        color: #6b7280;
      }
      .search-footer kbd {
        padding: 2px 6px;
        background: #2a3441;
        border-radius: 3px;
        margin-right: 4px;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * 绑定事件
   */
  private bindEvents(): void {
    // 点击遮罩关闭
    this.overlay?.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.close();
      }
    });

    // 输入搜索
    this.input?.addEventListener('input', () => {
      this.search(this.input?.value || '');
    });

    // 键盘导航
    this.input?.addEventListener('keydown', (e) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          this.selectNext();
          break;
        case 'ArrowUp':
          e.preventDefault();
          this.selectPrev();
          break;
        case 'Enter':
          e.preventDefault();
          this.confirmSelection();
          break;
        case 'Escape':
          e.preventDefault();
          this.close();
          break;
      }
    });

    // 点击选择
    this.list?.addEventListener('click', (e) => {
      const item = (e.target as HTMLElement).closest('.search-item') as HTMLElement;
      if (item) {
        const key = item.dataset.key;
        if (key) {
          this.selectTool(key);
        }
      }
    });

    // 全局快捷键
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        this.toggle();
      }
    });
  }

  /**
   * 搜索
   */
  private search(query: string): void {
    const configs = toolRegistry.getAllConfigs();
    const q = query.toLowerCase().trim();

    if (!q) {
      this.filteredConfigs = configs;
    } else {
      this.filteredConfigs = configs.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.key.toLowerCase().includes(q) ||
          c.description?.toLowerCase().includes(q) ||
          c.keywords?.some((k) => k.toLowerCase().includes(q))
      );
    }

    this.selectedIndex = 0;
    this.renderList();
  }

  /**
   * 渲染列表
   */
  private renderList(): void {
    if (!this.list) return;

    if (this.filteredConfigs.length === 0) {
      this.list.innerHTML = `<div class="search-empty">${i18n.t('search.noResults')}</div>`;
      return;
    }

    this.list.innerHTML = this.filteredConfigs
      .map(
        (config, index) => `
        <div class="search-item ${index === this.selectedIndex ? 'selected' : ''}" data-key="${config.key}">
          <div class="search-item-icon">${config.icon || '🔧'}</div>
          <div class="search-item-info">
            <div class="search-item-title">${config.title}</div>
            <div class="search-item-desc">${config.description || ''}</div>
          </div>
          <span class="search-item-category">${CATEGORY_ICONS[config.category]} ${getCategoryLabel(config.category)}</span>
        </div>
      `
      )
      .join('');
  }

  /**
   * 选择下一个
   */
  private selectNext(): void {
    if (this.selectedIndex < this.filteredConfigs.length - 1) {
      this.selectedIndex++;
      this.renderList();
      this.scrollToSelected();
    }
  }

  /**
   * 选择上一个
   */
  private selectPrev(): void {
    if (this.selectedIndex > 0) {
      this.selectedIndex--;
      this.renderList();
      this.scrollToSelected();
    }
  }

  /**
   * 滚动到选中项
   */
  private scrollToSelected(): void {
    const selected = this.list?.querySelector('.search-item.selected');
    selected?.scrollIntoView({ block: 'nearest' });
  }

  /**
   * 确认选择
   */
  private confirmSelection(): void {
    const config = this.filteredConfigs[this.selectedIndex];
    if (config) {
      this.selectTool(config.key);
    }
  }

  /**
   * 选择工具
   */
  private selectTool(key: string): void {
    this.close();

    // 调用 switchSite
    if (typeof (window as any).switchSite === 'function') {
      (window as any).switchSite(key);
    }
  }

  /**
   * 打开面板
   */
  open(): void {
    if (this.isOpen) return;
    this.isOpen = true;
    this.overlay?.classList.add('open');
    this.search('');
    this.input?.focus();
  }

  /**
   * 关闭面板
   */
  close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.overlay?.classList.remove('open');
    if (this.input) {
      this.input.value = '';
    }
  }

  /**
   * 切换面板
   */
  toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }
}

export const searchPanel = new SearchPanel();
