/**
 * Emoji 图片选择器组件
 * 支持 1630+ 个 emoji 图片，分 9 个类别
 */

import { emojiCategories, EmojiCategory } from '../assets/emojis/index';
import { i18n } from '../core/i18n';

export interface EmojiPickerOptions {
  onSelect: (emojiPath: string, emojiName: string) => void;
  onClose?: () => void;
}

// 缓存 emoji 文件列表
let emojiCache: Map<string, string[]> | null = null;

export class EmojiPicker {
  private overlay: HTMLElement;
  private container: HTMLElement;
  private options: EmojiPickerOptions;
  private currentCategory: string = 'smileys';
  private emojiFiles: Map<string, string[]> = new Map();
  private searchInput: HTMLInputElement | null = null;
  private emojiGrid: HTMLElement | null = null;

  constructor(options: EmojiPickerOptions) {
    this.options = options;
    this.overlay = document.createElement('div');
    this.container = document.createElement('div');
    this.init();
  }

  private async init(): Promise<void> {
    // 使用缓存或加载 emoji 文件列表
    if (emojiCache) {
      this.emojiFiles = emojiCache;
    } else {
      await this.loadEmojiFiles();
      emojiCache = this.emojiFiles;
    }
    this.render();
  }

  private async loadEmojiFiles(): Promise<void> {
    // 通过 IPC 获取 emoji 文件列表
    for (const category of emojiCategories) {
      try {
        const files = await (window as any).llmHub.listEmojiFiles(category.dir);
        this.emojiFiles.set(category.id, files);
      } catch (e) {
        console.warn(`Failed to load emojis for ${category.dir}:`, e);
        this.emojiFiles.set(category.id, []);
      }
    }
  }

  private render(): void {
    this.overlay.className = 'emoji-picker-overlay';
    this.container.className = 'emoji-picker-dialog';

    // 分类标签
    const tabs = emojiCategories.map(cat => 
      `<div class="emoji-tab ${cat.id === this.currentCategory ? 'active' : ''}" data-category="${cat.id}" title="${cat.name}">${cat.icon}</div>`
    ).join('');

    this.container.innerHTML = `
      <div class="emoji-picker-header">
        <div class="emoji-picker-title">${i18n.t('emoji.selectIcon')}</div>
        <div class="emoji-picker-close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </div>
      </div>
      <div class="emoji-picker-search">
        <input type="text" placeholder="${i18n.t('emoji.searchPlaceholder')}" class="emoji-search-input" />
      </div>
      <div class="emoji-tabs">${tabs}</div>
      <div class="emoji-grid-container">
        <div class="emoji-grid"></div>
      </div>
    `;

    this.overlay.appendChild(this.container);

    // 绑定事件
    this.bindEvents();

    // 渲染当前分类的 emoji
    this.emojiGrid = this.container.querySelector('.emoji-grid');
    this.searchInput = this.container.querySelector('.emoji-search-input');
    this.renderEmojis();
  }

  private bindEvents(): void {
    // 关闭按钮
    this.container.querySelector('.emoji-picker-close')?.addEventListener('click', () => {
      this.close();
    });

    // 点击遮罩关闭
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.close();
      }
    });

    // ESC 关闭
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.close();
        document.removeEventListener('keydown', handleKeydown);
      }
    };
    document.addEventListener('keydown', handleKeydown);

    // 分类切换
    this.container.querySelectorAll('.emoji-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.currentCategory = (tab as HTMLElement).dataset.category || 'smileys';
        this.container.querySelectorAll('.emoji-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.renderEmojis();
      });
    });

    // 搜索
    this.container.querySelector('.emoji-search-input')?.addEventListener('input', (e) => {
      const query = (e.target as HTMLInputElement).value.trim().toLowerCase();
      this.renderEmojis(query);
    });
  }

  private renderEmojis(searchQuery?: string): void {
    if (!this.emojiGrid) return;

    let emojisToRender: { file: string; dir: string; name: string }[] = [];

    if (searchQuery) {
      // 搜索所有分类
      for (const category of emojiCategories) {
        const files = this.emojiFiles.get(category.id) || [];
        files.forEach(file => {
          const name = this.getEmojiName(file);
          if (name.toLowerCase().includes(searchQuery)) {
            emojisToRender.push({ file, dir: category.dir, name });
          }
        });
      }
    } else {
      // 显示当前分类
      const category = emojiCategories.find(c => c.id === this.currentCategory);
      if (category) {
        const files = this.emojiFiles.get(category.id) || [];
        emojisToRender = files.map(file => ({
          file,
          dir: category.dir,
          name: this.getEmojiName(file)
        }));
      }
    }

    // 渲染 emoji 网格
    this.emojiGrid.innerHTML = emojisToRender.map(({ file, dir, name }) => {
      const path = `assets/emojis/${encodeURIComponent(dir)}/${encodeURIComponent(file)}`;
      return `<div class="emoji-img-item" data-path="${path}" data-name="${name}" title="${name}">
        <img src="${path}" alt="${name}" loading="lazy" />
      </div>`;
    }).join('');

    // 绑定点击事件
    this.emojiGrid.querySelectorAll('.emoji-img-item').forEach(item => {
      item.addEventListener('click', () => {
        const path = (item as HTMLElement).dataset.path || '';
        const name = (item as HTMLElement).dataset.name || '';
        this.options.onSelect(path, name);
        this.close();
      });
    });
  }

  private getEmojiName(filename: string): string {
    // 从文件名提取 emoji 名称，如 "baby chick_1f424.png" -> "baby chick"
    return filename.replace(/_[a-f0-9-]+\.png$/i, '').replace(/\.png$/i, '');
  }

  public open(): void {
    document.body.appendChild(this.overlay);
    setTimeout(() => {
      this.searchInput?.focus();
    }, 100);
  }

  public close(): void {
    this.overlay.remove();
    this.options.onClose?.();
  }
}
