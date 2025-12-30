/**
 * 应用主入口（新架构）
 */

import { toolRegistry } from './core/ToolRegistry';
import { eventBus } from './core/EventBus';
import { themeManager } from './core/ThemeManager';
import { favoriteManager } from './core/FavoriteManager';
import { categoryManager, CategoryItem } from './core/CategoryManager';
import { i18n } from './core/i18n';
import { EventType } from './types/index';
import { tools, UsageTracker } from './tools/index';
import { StatsPanel } from './tools/stats/StatsPanel';
import { Toast, toast } from './components/Toast';
import { Sidebar } from './components/Sidebar';
import { CommandPalette, CommandItem } from './components/CommandPalette';
import { AboutPage } from './components/AboutPage';
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

class App {
  private currentKey: string | null = null;
  private container: HTMLElement | null = null;
  private llmContainer: HTMLElement | null = null;
  private webviews: Map<string, HTMLElement> = new Map();
  private statsPanel: StatsPanel | null = null;
  private sidebar: Sidebar | null = null;
  private commandPalette: CommandPalette | null = null;
  private addItemDialog: HTMLElement | null = null;
  private addItemTargetCategory: string | null = null;
  private aboutPage: AboutPage | null = null;

  constructor() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.init());
    } else {
      this.init();
    }
  }

  private init(): void {
    console.log('[App] Initializing...');

    this.container = document.getElementById('mainContainer');
    this.llmContainer = document.getElementById('llmContainer');
    const sidebarEl = document.getElementById('sidebar');

    if (!this.container || !sidebarEl) {
      console.error('[App] Required DOM elements not found');
      return;
    }

    // 注册所有工具
    toolRegistry.registerAll(tools);
    console.log(`[App] Registered ${toolRegistry.size} tools`);

    // 注册工具到 CategoryManager
    this.registerToolsToCategory();

    // 初始化 Toast 组件
    Toast.getInstance();

    // 初始化主题
    console.log(`[App] Theme: ${themeManager.getResolvedTheme()}`);

    // 初始化左侧边栏
    this.initSidebar(sidebarEl);

    // 初始化 Command Palette
    this.initCommandPalette();

    // 初始化添加项目对话框
    this.initAddItemDialog();

    // 监听事件
    this.setupEventListeners();

    // 设置快捷键
    this.setupKeyboardShortcuts();

    // 设置设置面板
    this.setupSettings();

    // 设置统计面板
    this.setupStats();

    // 设置全局工具栏
    this.setupGlobalToolbar();

    // 设置页面卸载时保存使用数据
    this.setupUnloadHandler();

    // 隐藏加载状态
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'none';

    // 默认打开第一个可用项目
    this.openDefaultItem();

    console.log('[App] Initialization complete');
  }

  private registerToolsToCategory(): void {
    const allToolConfigs = toolRegistry.getAllConfigs();
    allToolConfigs.forEach(config => {
      categoryManager.registerTool(config.key, config.title, config.icon || '🔧');
    });
  }

  private openDefaultItem(): void {
    const LAST_ITEM_KEY = 'toolhub_last_item';
    const FIRST_LAUNCH_KEY = 'toolhub_first_launch';
    
    // 检查是否首次启动
    const isFirstLaunch = !localStorage.getItem(FIRST_LAUNCH_KEY);
    
    if (isFirstLaunch) {
      // 首次启动，显示欢迎页面
      localStorage.setItem(FIRST_LAUNCH_KEY, 'true');
      this.showAboutPage();
      return;
    }
    
    // 尝试恢复上次选择的项目
    const lastItem = localStorage.getItem(LAST_ITEM_KEY);
    if (lastItem && lastItem !== '__about__' && categoryManager.getItem(lastItem)) {
      this.switchToItem(lastItem);
      return;
    }

    // 否则打开第一个目录的第一个项目
    const categories = categoryManager.getCategories();
    for (const category of categories) {
      if (category.items.length > 0) {
        this.switchToItem(category.items[0]);
        return;
      }
    }

    // 如果没有任何项目，显示欢迎页面
    this.showAboutPage();
  }

  private saveLastItem(key: string): void {
    try {
      localStorage.setItem('toolhub_last_item', key);
    } catch (e) {
      // ignore
    }
  }

  private initSidebar(container: HTMLElement): void {
    this.sidebar = new Sidebar(container, {
      onItemClick: (key, type) => {
        this.switchToItem(key);
      },
      onItemEdit: (key) => {
        this.editCustomSite(key);
      },
      onAddItem: (categoryId) => {
        this.showAddItemDialog(categoryId);
      },
    });
  }

  private initCommandPalette(): void {
    const items = this.buildCommandItems();
    
    this.commandPalette = new CommandPalette({
      items,
      placeholder: '搜索工具或 AI 助手...',
      onSelect: (key) => {
        this.switchToItem(key);
      },
    });

    // 订阅数据变化更新 Command Palette
    categoryManager.subscribe(() => {
      this.commandPalette?.updateItems(this.buildCommandItems());
    });
  }

  private buildCommandItems(): CommandItem[] {
    const items: CommandItem[] = [];
    const categories = categoryManager.getCategories();

    categories.forEach(category => {
      category.items.forEach(itemKey => {
        const item = categoryManager.getItem(itemKey);
        if (item) {
          items.push({
            key: item.key,
            title: item.title,
            icon: item.icon,
            color: item.color,
            category: category.title,
            keywords: [item.title.toLowerCase(), item.type],
          });
        }
      });
    });

    return items;
  }

  private initAddItemDialog(): void {
    this.addItemDialog = document.createElement('div');
    this.addItemDialog.className = 'add-site-overlay';
    this.addItemDialog.style.display = 'none';
    this.addItemDialog.innerHTML = `
      <div class="add-site-dialog">
        <div class="add-site-header">
          <div class="add-site-title">添加网站</div>
          <button class="add-site-close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div class="add-site-body">
          <div class="add-site-preview">
            <div class="add-site-preview-icon" style="background: #3b82f6"></div>
          </div>
          <div class="add-site-field">
            <label>网站名称</label>
            <input type="text" class="add-site-name-input" placeholder="例如：GitHub" />
          </div>
          <div class="add-site-field">
            <label>网站地址</label>
            <input type="text" class="add-site-url-input" placeholder="https://github.com" />
          </div>
          <div class="add-site-field">
            <label>所属目录</label>
            <select class="add-site-category-select"></select>
          </div>
          <div class="add-site-field">
            <label>图标颜色</label>
            <div class="add-site-color-row">
              <div class="add-site-color-presets">
                <div class="color-preset active" data-color="#3b82f6" style="background: #3b82f6"></div>
                <div class="color-preset" data-color="#10b981" style="background: #10b981"></div>
                <div class="color-preset" data-color="#22c55e" style="background: #22c55e"></div>
                <div class="color-preset" data-color="#f59e0b" style="background: #f59e0b"></div>
                <div class="color-preset" data-color="#f97316" style="background: #f97316"></div>
                <div class="color-preset" data-color="#ef4444" style="background: #ef4444"></div>
                <div class="color-preset" data-color="#dc2626" style="background: #dc2626"></div>
                <div class="color-preset" data-color="#8b5cf6" style="background: #8b5cf6"></div>
                <div class="color-preset" data-color="#7c3aed" style="background: #7c3aed"></div>
                <div class="color-preset" data-color="#ec4899" style="background: #ec4899"></div>
                <div class="color-preset" data-color="#d946ef" style="background: #d946ef"></div>
                <div class="color-preset" data-color="#06b6d4" style="background: #06b6d4"></div>
                <div class="color-preset" data-color="#0ea5e9" style="background: #0ea5e9"></div>
                <div class="color-preset" data-color="#14b8a6" style="background: #14b8a6"></div>
                <div class="color-preset" data-color="#6b7280" style="background: #6b7280"></div>
                <div class="color-preset" data-color="#374151" style="background: #374151"></div>
              </div>
              <input type="color" class="add-site-color-input" value="#3b82f6" />
            </div>
          </div>
        </div>
        <div class="add-site-footer">
          <button class="add-site-cancel">取消</button>
          <button class="add-site-confirm">确定</button>
        </div>
      </div>
    `;

    // 取消按钮
    this.addItemDialog.querySelector('.add-site-cancel')?.addEventListener('click', () => {
      this.hideAddItemDialog();
    });

    // 关闭按钮
    this.addItemDialog.querySelector('.add-site-close')?.addEventListener('click', () => {
      this.hideAddItemDialog();
    });

    // 点击遮罩关闭
    this.addItemDialog.addEventListener('click', (e) => {
      if (e.target === this.addItemDialog) {
        this.hideAddItemDialog();
      }
    });

    // 确定按钮
    this.addItemDialog.querySelector('.add-site-confirm')?.addEventListener('click', () => {
      this.confirmAddItem();
    });

    // 回车提交
    this.addItemDialog.querySelectorAll('input[type="text"]').forEach(input => {
      input.addEventListener('keydown', (e: Event) => {
        const ke = e as KeyboardEvent;
        if (ke.key === 'Enter') {
          this.confirmAddItem();
        } else if (ke.key === 'Escape') {
          this.hideAddItemDialog();
        }
      });
    });

    // 颜色预设点击
    const colorPresets = this.addItemDialog.querySelectorAll('.color-preset');
    const colorInput = this.addItemDialog.querySelector('.add-site-color-input') as HTMLInputElement;
    const previewIcon = this.addItemDialog.querySelector('.add-site-preview-icon') as HTMLElement;

    colorPresets.forEach(preset => {
      preset.addEventListener('click', () => {
        const color = (preset as HTMLElement).dataset.color || '#3b82f6';
        colorPresets.forEach(p => p.classList.remove('active'));
        preset.classList.add('active');
        colorInput.value = color;
        this.updateAddSitePreview();
      });
    });

    // 颜色选择器变化
    colorInput?.addEventListener('input', () => {
      colorPresets.forEach(p => p.classList.remove('active'));
      this.updateAddSitePreview();
    });

    // 名称输入时更新预览
    const nameInput = this.addItemDialog.querySelector('.add-site-name-input') as HTMLInputElement;
    nameInput?.addEventListener('input', () => {
      this.updateAddSitePreview();
    });

    document.body.appendChild(this.addItemDialog);
  }

  // 生成网站图标缩写
  private generateSiteAbbr(name: string): string {
    if (!name) return '';
    const trimmed = name.trim();
    if (!trimmed) return '';
    
    // 检查第一个字符是否为中文
    const firstChar = trimmed.charAt(0);
    const isChinese = /[\u4e00-\u9fa5]/.test(firstChar);
    
    if (isChinese) {
      // 中文：取第一个汉字
      return firstChar;
    } else {
      // 英文：取前两个字母大写
      const letters = trimmed.replace(/[^a-zA-Z]/g, '');
      if (letters.length >= 2) {
        return letters.substring(0, 2).toUpperCase();
      } else if (letters.length === 1) {
        return letters.toUpperCase();
      }
      return trimmed.charAt(0).toUpperCase();
    }
  }

  // 更新添加网站对话框的预览
  private updateAddSitePreview(): void {
    if (!this.addItemDialog) return;
    
    const nameInput = this.addItemDialog.querySelector('.add-site-name-input') as HTMLInputElement;
    const colorInput = this.addItemDialog.querySelector('.add-site-color-input') as HTMLInputElement;
    const previewIcon = this.addItemDialog.querySelector('.add-site-preview-icon') as HTMLElement;
    
    if (!previewIcon) return;
    
    const name = nameInput?.value.trim() || '';
    const color = colorInput?.value || '#3b82f6';
    const abbr = this.generateSiteAbbr(name);
    
    previewIcon.style.background = color;
    previewIcon.textContent = abbr;
  }

  private showAddItemDialog(categoryId: string): void {
    this.addItemTargetCategory = categoryId;
    if (!this.addItemDialog) return;

    // 重置表单
    const nameInput = this.addItemDialog.querySelector('.add-site-name-input') as HTMLInputElement;
    const urlInput = this.addItemDialog.querySelector('.add-site-url-input') as HTMLInputElement;
    const colorInput = this.addItemDialog.querySelector('.add-site-color-input') as HTMLInputElement;
    const colorPresets = this.addItemDialog.querySelectorAll('.color-preset');
    const previewIcon = this.addItemDialog.querySelector('.add-site-preview-icon') as HTMLElement;
    const categorySelect = this.addItemDialog.querySelector('.add-site-category-select') as HTMLSelectElement;

    if (nameInput) nameInput.value = '';
    if (urlInput) urlInput.value = '';
    if (colorInput) colorInput.value = '#3b82f6';
    
    // 填充目录下拉选择
    if (categorySelect) {
      const categories = categoryManager.getCategories();
      categorySelect.innerHTML = categories.map(cat => 
        `<option value="${cat.id}" ${cat.id === categoryId ? 'selected' : ''}>${cat.icon} ${cat.title}</option>`
      ).join('');
    }
    
    // 重置颜色预设选中状态
    colorPresets.forEach((p, i) => {
      if (i === 0) p.classList.add('active');
      else p.classList.remove('active');
    });
    
    // 重置预览
    if (previewIcon) {
      previewIcon.style.background = '#3b82f6';
      previewIcon.textContent = '';
    }

    // 显示对话框
    this.addItemDialog.style.display = 'flex';

    // 聚焦到名称输入框
    setTimeout(() => nameInput?.focus(), 100);
  }

  private hideAddItemDialog(): void {
    if (this.addItemDialog) {
      this.addItemDialog.style.display = 'none';
    }
    this.addItemTargetCategory = null;
  }

  private confirmAddItem(): void {
    const categorySelect = this.addItemDialog?.querySelector('.add-site-category-select') as HTMLSelectElement;
    const targetCategory = categorySelect?.value || this.addItemTargetCategory;
    
    if (!targetCategory) return;

    const nameInput = this.addItemDialog?.querySelector('.add-site-name-input') as HTMLInputElement;
    const urlInput = this.addItemDialog?.querySelector('.add-site-url-input') as HTMLInputElement;
    const colorInput = this.addItemDialog?.querySelector('.add-site-color-input') as HTMLInputElement;

    const name = nameInput?.value.trim();
    let url = urlInput?.value.trim();
    const color = colorInput?.value || '#3b82f6';

    if (!name) {
      nameInput?.focus();
      nameInput?.classList.add('shake');
      setTimeout(() => nameInput?.classList.remove('shake'), 500);
      return;
    }

    if (!url) {
      urlInput?.focus();
      urlInput?.classList.add('shake');
      setTimeout(() => urlInput?.classList.remove('shake'), 500);
      return;
    }

    // 自动补全 https
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    // 使用名称缩写作为图标
    const icon = this.generateSiteAbbr(name);

    const item = categoryManager.addCustomSite(name, url, icon, color, targetCategory);
    toast({ message: `已添加「${name}」`, duration: 2000 });
    this.hideAddItemDialog();
    this.switchToItem(item.key);
  }

  private editCustomSite(key: string): void {
    const item = categoryManager.getItem(key);
    if (!item || item.type !== 'custom-site') return;

    const currentCategory = categoryManager.getItemCategory(key);
    const categories = categoryManager.getCategories();
    const categoryOptions = categories.map(cat => 
      `<option value="${cat.id}" ${cat.id === currentCategory?.id ? 'selected' : ''}>${cat.icon} ${cat.title}</option>`
    ).join('');

    const dialog = document.createElement('div');
    dialog.className = 'add-site-overlay';
    dialog.innerHTML = `
      <div class="add-site-dialog">
        <div class="add-site-header">
          <div class="add-site-title">编辑网站</div>
          <button class="add-site-close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div class="add-site-body">
          <div class="add-site-preview">
            <div class="add-site-preview-icon" style="background: ${item.color}">${item.icon}</div>
          </div>
          <div class="add-site-field">
            <label>网站名称</label>
            <input type="text" class="add-site-name-input" value="${item.title}" />
          </div>
          <div class="add-site-field">
            <label>网站地址</label>
            <input type="text" class="add-site-url-input" value="${item.url || ''}" />
          </div>
          <div class="add-site-field">
            <label>所属目录</label>
            <select class="add-site-category-select">${categoryOptions}</select>
          </div>
          <div class="add-site-field">
            <label>图标颜色</label>
            <div class="add-site-color-row">
              <div class="add-site-color-presets">
                <div class="color-preset ${item.color === '#3b82f6' ? 'active' : ''}" data-color="#3b82f6" style="background: #3b82f6"></div>
                <div class="color-preset ${item.color === '#10b981' ? 'active' : ''}" data-color="#10b981" style="background: #10b981"></div>
                <div class="color-preset ${item.color === '#22c55e' ? 'active' : ''}" data-color="#22c55e" style="background: #22c55e"></div>
                <div class="color-preset ${item.color === '#f59e0b' ? 'active' : ''}" data-color="#f59e0b" style="background: #f59e0b"></div>
                <div class="color-preset ${item.color === '#f97316' ? 'active' : ''}" data-color="#f97316" style="background: #f97316"></div>
                <div class="color-preset ${item.color === '#ef4444' ? 'active' : ''}" data-color="#ef4444" style="background: #ef4444"></div>
                <div class="color-preset ${item.color === '#dc2626' ? 'active' : ''}" data-color="#dc2626" style="background: #dc2626"></div>
                <div class="color-preset ${item.color === '#8b5cf6' ? 'active' : ''}" data-color="#8b5cf6" style="background: #8b5cf6"></div>
                <div class="color-preset ${item.color === '#7c3aed' ? 'active' : ''}" data-color="#7c3aed" style="background: #7c3aed"></div>
                <div class="color-preset ${item.color === '#ec4899' ? 'active' : ''}" data-color="#ec4899" style="background: #ec4899"></div>
                <div class="color-preset ${item.color === '#d946ef' ? 'active' : ''}" data-color="#d946ef" style="background: #d946ef"></div>
                <div class="color-preset ${item.color === '#06b6d4' ? 'active' : ''}" data-color="#06b6d4" style="background: #06b6d4"></div>
                <div class="color-preset ${item.color === '#0ea5e9' ? 'active' : ''}" data-color="#0ea5e9" style="background: #0ea5e9"></div>
                <div class="color-preset ${item.color === '#14b8a6' ? 'active' : ''}" data-color="#14b8a6" style="background: #14b8a6"></div>
                <div class="color-preset ${item.color === '#6b7280' ? 'active' : ''}" data-color="#6b7280" style="background: #6b7280"></div>
                <div class="color-preset ${item.color === '#374151' ? 'active' : ''}" data-color="#374151" style="background: #374151"></div>
              </div>
              <input type="color" class="add-site-color-input" value="${item.color}" />
            </div>
          </div>
        </div>
        <div class="add-site-footer">
          <button class="edit-site-delete">删除</button>
          <div style="flex:1"></div>
          <button class="add-site-cancel">取消</button>
          <button class="add-site-confirm">保存</button>
        </div>
      </div>
    `;

    const nameInput = dialog.querySelector('.add-site-name-input') as HTMLInputElement;
    const urlInput = dialog.querySelector('.add-site-url-input') as HTMLInputElement;
    const colorInput = dialog.querySelector('.add-site-color-input') as HTMLInputElement;
    const categorySelect = dialog.querySelector('.add-site-category-select') as HTMLSelectElement;
    const previewIcon = dialog.querySelector('.add-site-preview-icon') as HTMLElement;
    const colorPresets = dialog.querySelectorAll('.color-preset');

    // 更新预览函数
    const updatePreview = () => {
      const name = nameInput?.value.trim() || '';
      const color = colorInput?.value || '#3b82f6';
      const abbr = this.generateSiteAbbr(name);
      previewIcon.style.background = color;
      previewIcon.textContent = abbr;
    };

    // 名称输入时更新预览
    nameInput?.addEventListener('input', updatePreview);

    // 颜色预设点击
    colorPresets.forEach(preset => {
      preset.addEventListener('click', () => {
        const color = (preset as HTMLElement).dataset.color || '#3b82f6';
        colorPresets.forEach(p => p.classList.remove('active'));
        preset.classList.add('active');
        colorInput.value = color;
        updatePreview();
      });
    });

    // 颜色选择器变化
    colorInput?.addEventListener('input', () => {
      colorPresets.forEach(p => p.classList.remove('active'));
      updatePreview();
    });

    dialog.querySelector('.add-site-cancel')?.addEventListener('click', () => dialog.remove());
    dialog.querySelector('.add-site-close')?.addEventListener('click', () => dialog.remove());
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) dialog.remove();
    });

    dialog.querySelector('.edit-site-delete')?.addEventListener('click', () => {
      if (confirm(`确定删除「${item.title}」吗？`)) {
        // 如果删除的是当前显示的网站，切换到其他
        if (this.currentKey === key) {
          const categories = categoryManager.getCategories();
          const firstItem = categories[0]?.items[0];
          if (firstItem) {
            this.switchToItem(firstItem);
          }
        }
        // 删除 webview
        const webview = this.webviews.get(key);
        if (webview) {
          webview.remove();
          this.webviews.delete(key);
        }
        categoryManager.deleteCustomSite(key);
        toast({ message: '已删除', duration: 2000 });
        dialog.remove();
      }
    });

    dialog.querySelector('.add-site-confirm')?.addEventListener('click', () => {
      const name = nameInput?.value.trim();
      let url = urlInput?.value.trim();
      const color = colorInput?.value;
      const newCategoryId = categorySelect?.value;

      if (!name || !url) {
        toast({ message: '请填写名称和网址', duration: 2000 });
        return;
      }

      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }

      // 使用名称缩写作为图标
      const icon = this.generateSiteAbbr(name);

      categoryManager.updateCustomSite(key, { title: name, url, icon, color });
      
      // 如果目录变了，移动项目
      if (newCategoryId && newCategoryId !== currentCategory?.id) {
        categoryManager.moveItem(key, newCategoryId);
      }
      
      // 如果 URL 变了，需要重新加载 webview
      if (item.url !== url) {
        const webview = this.webviews.get(key) as any;
        if (webview) {
          webview.src = url;
        }
      }

      toast({ message: '已保存', duration: 2000 });
      dialog.remove();
    });

    document.body.appendChild(dialog);
    setTimeout(() => nameInput?.focus(), 0);
  }

  private switchToItem(key: string): void {
    const item = categoryManager.getItem(key);
    if (!item) {
      console.warn(`[App] Item "${key}" not found`);
      return;
    }

    // 保存最后选择的项目
    this.saveLastItem(key);

    if (item.type === 'tool') {
      this.switchTool(key);
      this.updateBottomBarUrl(null); // 工具模式隐藏 URL
    } else {
      // LLM 或自定义网站
      this.switchWebview(key, item);
      this.updateBottomBarUrl(item.url || null); // 显示网站 URL
    }
  }

  private updateBottomBarUrl(url: string | null): void {
    const urlContainer = document.getElementById('bottomBarUrl');
    const urlText = urlContainer?.querySelector('.bottom-bar-url-text');
    const navContainer = document.getElementById('bottomBarNav');
    
    if (!urlContainer || !urlText) return;

    if (url) {
      urlText.textContent = url;
      urlContainer.classList.add('visible');
      urlContainer.title = `点击在浏览器中打开`;
      navContainer?.classList.add('visible');
      this.updateNavButtonsState();
    } else {
      urlContainer.classList.remove('visible');
      urlText.textContent = '';
      navContainer?.classList.remove('visible');
    }
  }

  private updateNavButtonsState(): void {
    const backBtn = document.getElementById('webviewBackBtn');
    const forwardBtn = document.getElementById('webviewForwardBtn');
    
    if (!backBtn || !forwardBtn) return;

    if (this.currentKey && this.webviews.has(this.currentKey)) {
      const webview = this.webviews.get(this.currentKey) as any;
      if (webview) {
        const canGoBack = typeof webview.canGoBack === 'function' && webview.canGoBack();
        const canGoForward = typeof webview.canGoForward === 'function' && webview.canGoForward();
        
        backBtn.classList.toggle('disabled', !canGoBack);
        forwardBtn.classList.toggle('disabled', !canGoForward);
        return;
      }
    }
    
    // 默认禁用
    backBtn.classList.add('disabled');
    forwardBtn.classList.add('disabled');
  }

  private switchWebview(key: string, item: CategoryItem): void {
    if (!this.llmContainer || !this.container) return;

    // 结束工具使用追踪
    if (this.currentKey) {
      UsageTracker.end();
    }

    // 失活当前工具
    if (this.currentKey) {
      const currentItem = categoryManager.getItem(this.currentKey);
      if (currentItem?.type === 'tool') {
        const currentTool = toolRegistry.getInstance(this.currentKey);
        currentTool?.deactivate();
      }
    }

    // 隐藏工具容器，显示 LLM 容器
    this.container.style.display = 'none';
    this.llmContainer.style.display = 'block';

    // 隐藏其他 webview
    this.webviews.forEach((wv, k) => {
      (wv as HTMLElement).style.display = k === key ? 'flex' : 'none';
    });

    // 创建 webview（如果不存在）
    if (!this.webviews.has(key) && item.url) {
      this.createWebview(key, item.url);
    }

    this.currentKey = key;
    this.sidebar?.setActive(key, true);
    UsageTracker.start(key);
  }

  private createWebview(key: string, url: string): void {
    if (!this.llmContainer) return;

    const webview = document.createElement('webview');
    webview.setAttribute('src', url);
    webview.setAttribute('partition', `persist:${key}`);
    webview.setAttribute('allowpopups', 'true');
    webview.className = 'llm-webview';
    webview.style.cssText = 'width: 100%; height: 100%; display: flex;';

    // 监听导航事件，更新前进后退按钮状态
    webview.addEventListener('did-navigate', () => {
      if (this.currentKey === key) {
        this.updateNavButtonsState();
      }
    });
    webview.addEventListener('did-navigate-in-page', () => {
      if (this.currentKey === key) {
        this.updateNavButtonsState();
      }
    });

    this.llmContainer.appendChild(webview);
    this.webviews.set(key, webview);
  }

  private setupUnloadHandler(): void {
    window.addEventListener('beforeunload', () => {
      UsageTracker.end();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.currentKey) {
        UsageTracker.end();
      } else if (!document.hidden && this.currentKey) {
        UsageTracker.start(this.currentKey);
      }
    });
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

  private setupKeyboardShortcuts(): void {
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
        const toolKey = TOOL_SHORTCUTS[e.key];
        if (toolKey && toolRegistry.has(toolKey)) {
          e.preventDefault();
          this.switchTool(toolKey);
          toast({ message: `切换到 ${toolRegistry.getInstance(toolKey)?.config.title}`, duration: 1500 });
        }
      }

      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'd') {
        e.preventDefault();
        themeManager.toggle();
        toast({ message: `已切换到${themeManager.getResolvedTheme() === 'dark' ? '深色' : '浅色'}主题`, duration: 1500 });
      }

      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === 'd' && this.currentKey) {
        e.preventDefault();
        favoriteManager.toggle(this.currentKey);
      }

      if (e.key === 'Escape') {
        // 关闭设置面板
        const settingsModal = document.getElementById('settingsModal');
        if (settingsModal?.classList.contains('show')) {
          settingsModal.classList.remove('show');
        }
        // 关闭统计面板
        const statsModal = document.getElementById('statsModal');
        if (statsModal?.classList.contains('show')) {
          statsModal.classList.remove('show');
        }
        this.hideAddItemDialog();
      }
    });
  }

  private setupSettings(): void {
    const settingsModal = document.getElementById('settingsModal');
    const settingsClose = document.getElementById('settingsClose');
    const settingsNav = settingsModal?.querySelectorAll('.settings-nav-item');

    if (!settingsModal || !settingsClose) return;

    settingsClose.addEventListener('click', () => {
      settingsModal.classList.remove('show');
    });

    settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal) {
        settingsModal.classList.remove('show');
      }
    });

    // 导航切换
    settingsNav?.forEach(nav => {
      nav.addEventListener('click', () => {
        const tab = nav.getAttribute('data-tab');
        if (tab) {
          settingsNav.forEach(n => n.classList.remove('active'));
          nav.classList.add('active');
          this.renderSettingsTab(tab);
        }
      });
    });
  }

  private openSettings(): void {
    const settingsModal = document.getElementById('settingsModal');
    if (settingsModal) {
      // 默认显示通用标签
      const navItems = settingsModal.querySelectorAll('.settings-nav-item');
      navItems.forEach(n => n.classList.remove('active'));
      navItems[0]?.classList.add('active');
      this.renderSettingsTab('general');
      settingsModal.classList.add('show');
    }
  }

  private setupStats(): void {
    const statsModal = document.getElementById('statsModal');
    const statsClose = document.getElementById('statsClose');

    if (!statsModal || !statsClose) return;

    statsClose.addEventListener('click', () => {
      statsModal.classList.remove('show');
    });

    statsModal.addEventListener('click', (e) => {
      if (e.target === statsModal) {
        statsModal.classList.remove('show');
      }
    });
  }

  private openStats(): void {
    const statsModal = document.getElementById('statsModal');
    const statsBody = document.getElementById('statsBody');
    if (statsModal && statsBody) {
      if (!this.statsPanel) {
        this.statsPanel = new StatsPanel(statsBody);
      } else {
        this.statsPanel.refresh();
      }
      statsModal.classList.add('show');
    }
  }

  private showAboutPage(): void {
    if (!this.container) return;

    // 结束工具使用追踪
    if (this.currentKey) {
      UsageTracker.end();
    }

    // 隐藏当前工具和 webview
    this.hideCurrentTool();

    // 隐藏 LLM 容器，显示主容器
    if (this.llmContainer) {
      this.llmContainer.style.display = 'none';
    }
    this.container.style.display = 'block';

    // 清除侧边栏选中状态
    this.sidebar?.clearSelection();

    // 显示关于页面
    if (!this.aboutPage) {
      this.aboutPage = new AboutPage(this.container);
    }
    this.aboutPage.show();

    // 标记当前为关于页面
    this.currentKey = '__about__';
  }

  private hideCurrentTool(): void {
    // 隐藏所有工具容器
    const toolContainers = this.container?.querySelectorAll('.tool-container');
    toolContainers?.forEach(c => (c as HTMLElement).style.display = 'none');

    // 隐藏所有 webview
    this.webviews.forEach(webview => {
      webview.style.display = 'none';
    });
  }

  private setupGlobalToolbar(): void {
    const toggleSidebarBtn = document.getElementById('toggleSidebarBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    const addCategoryBtn = document.getElementById('addCategoryBtn');
    const addLinkBtn = document.getElementById('addLinkBtn');
    const expandSidebarBtn = document.getElementById('expandSidebarBtn');
    const sidebarArea = document.getElementById('sidebarArea');
    const themeBtnGlobal = document.getElementById('themeBtnGlobal');

    const updateSidebarAreaState = () => {
      const isCollapsed = this.sidebar?.isCollapsed();
      if (sidebarArea) {
        sidebarArea.classList.toggle('collapsed', isCollapsed || false);
      }
      if (expandSidebarBtn) {
        expandSidebarBtn.style.display = isCollapsed ? 'flex' : 'none';
      }
      (window as any).llmHub?.setTrafficLightVisibility?.(!isCollapsed);
    };

    toggleSidebarBtn?.addEventListener('click', () => {
      this.sidebar?.toggleCollapse();
      updateSidebarAreaState();
    });

    refreshBtn?.addEventListener('click', () => {
      this.refreshCurrentPage();
    });

    // 添加目录按钮
    addCategoryBtn?.addEventListener('click', () => {
      this.sidebar?.showAddCategoryDialog();
    });

    // 添加链接按钮 - 显示添加网站对话框（默认添加到第一个目录）
    addLinkBtn?.addEventListener('click', () => {
      const categories = categoryManager.getCategories();
      const firstCategory = categories[0];
      if (firstCategory) {
        this.showAddItemDialog(firstCategory.id);
      }
    });

    expandSidebarBtn?.addEventListener('click', () => {
      this.sidebar?.toggleCollapse();
      updateSidebarAreaState();
    });

    updateSidebarAreaState();

    // 主题切换按钮
    const updateThemeIcon = () => {
      const moonIcon = themeBtnGlobal?.querySelector('.theme-icon-moon') as HTMLElement;
      const sunIcon = themeBtnGlobal?.querySelector('.theme-icon-sun') as HTMLElement;
      const isDark = themeManager.getResolvedTheme() === 'dark';
      if (moonIcon) moonIcon.style.display = isDark ? 'block' : 'none';
      if (sunIcon) sunIcon.style.display = isDark ? 'none' : 'block';
    };

    themeBtnGlobal?.addEventListener('click', () => {
      themeManager.toggle();
      updateThemeIcon();
      const themeName = themeManager.getResolvedTheme() === 'dark' ? '深色' : '浅色';
      toast({ message: `已切换到${themeName}主题`, duration: 1500 });
    });

    // 初始化主题图标状态
    updateThemeIcon();

    // 底部功能栏
    const searchBtnGlobal = document.getElementById('searchBtnGlobal');
    const statsBtnGlobal = document.getElementById('statsBtnGlobal');
    const settingsBtnGlobal = document.getElementById('settingsBtnGlobal');

    searchBtnGlobal?.addEventListener('click', () => {
      this.commandPalette?.open();
    });

    statsBtnGlobal?.addEventListener('click', () => {
      this.openStats();
    });

    settingsBtnGlobal?.addEventListener('click', () => {
      this.openSettings();
    });

    // 关于页面按钮
    const aboutBtnGlobal = document.getElementById('aboutBtnGlobal');
    aboutBtnGlobal?.addEventListener('click', () => {
      this.showAboutPage();
    });

    // 底部栏 URL 点击复制
    const bottomBarUrl = document.getElementById('bottomBarUrl');
    bottomBarUrl?.addEventListener('click', () => {
      const urlText = bottomBarUrl.querySelector('.bottom-bar-url-text')?.textContent;
      if (urlText) {
        // 使用 Electron 的 shell 模块在默认浏览器中打开
        (window as any).llmHub?.openExternal?.(urlText);
      }
    });

    // Webview 前进后退按钮
    const webviewBackBtn = document.getElementById('webviewBackBtn');
    const webviewForwardBtn = document.getElementById('webviewForwardBtn');

    webviewBackBtn?.addEventListener('click', () => {
      if (webviewBackBtn.classList.contains('disabled')) return;
      if (this.currentKey && this.webviews.has(this.currentKey)) {
        const webview = this.webviews.get(this.currentKey) as any;
        if (webview && typeof webview.goBack === 'function' && webview.canGoBack()) {
          webview.goBack();
        }
      }
    });

    webviewForwardBtn?.addEventListener('click', () => {
      if (webviewForwardBtn.classList.contains('disabled')) return;
      if (this.currentKey && this.webviews.has(this.currentKey)) {
        const webview = this.webviews.get(this.currentKey) as any;
        if (webview && typeof webview.goForward === 'function' && webview.canGoForward()) {
          webview.goForward();
        }
      }
    });
  }

  private refreshCurrentPage(): void {
    if (this.currentKey && this.webviews.has(this.currentKey)) {
      const webview = this.webviews.get(this.currentKey) as any;
      if (webview && typeof webview.reload === 'function') {
        webview.reload();
        toast({ message: '页面已刷新', duration: 1500 });
      }
    } else if (this.currentKey) {
      const tool = toolRegistry.getInstance(this.currentKey);
      if (tool) {
        tool.deactivate();
        tool.activate();
        toast({ message: '工具已刷新', duration: 1500 });
      }
    }
  }

  private renderSettingsTab(tab: string): void {
    const container = document.getElementById('settingsBody');
    const titleEl = document.getElementById('settingsTabTitle');
    if (!container) return;

    const tabTitles: Record<string, string> = {
      general: i18n.t('settings.general'),
      theme: i18n.t('settings.theme'),
      about: i18n.t('about.title')
    };

    if (titleEl) {
      titleEl.textContent = tabTitles[tab] || tab;
    }

    if (tab === 'general') {
      // 获取当前语言设置
      const currentLang = i18n.getLanguage();
      
      container.innerHTML = `
        <div class="settings-section">
          <div class="settings-section-header">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="2" y1="12" x2="22" y2="12"></line>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
            </svg>
            <span>${i18n.t('settings.language')}</span>
          </div>
          <div class="settings-section-body">
            <div class="settings-select-group">
              <div class="settings-select-option ${currentLang === 'zh' ? 'active' : ''}" data-lang="zh">
                <div class="settings-select-icon">🇨🇳</div>
                <div class="settings-select-info">
                  <div class="settings-select-title">${i18n.t('lang.zh')}</div>
                  <div class="settings-select-desc">${i18n.t('lang.zhDesc')}</div>
                </div>
                <div class="settings-select-check">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" width="16" height="16">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
              </div>
              <div class="settings-select-option ${currentLang === 'en' ? 'active' : ''}" data-lang="en">
                <div class="settings-select-icon">🇺🇸</div>
                <div class="settings-select-info">
                  <div class="settings-select-title">${i18n.t('lang.en')}</div>
                  <div class="settings-select-desc">${i18n.t('lang.enDesc')}</div>
                </div>
                <div class="settings-select-check">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" width="16" height="16">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="settings-section settings-section-danger">
          <div class="settings-section-header">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
              <path d="M3 6h18"></path>
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
            </svg>
            <span>${i18n.t('settings.dataManagement')}</span>
          </div>
          <div class="settings-section-body">
            <div class="settings-danger-item">
              <div class="settings-danger-info">
                <div class="settings-danger-title">${i18n.t('settings.resetData')}</div>
                <div class="settings-danger-desc">${i18n.t('settings.resetDataDesc')}</div>
              </div>
              <button class="settings-danger-btn" id="resetCategoryBtn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
                  <path d="M21 3v5h-5"></path>
                  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
                  <path d="M3 21v-5h5"></path>
                </svg>
                ${i18n.t('common.reset')}
              </button>
            </div>
          </div>
        </div>
      `;

      // 语言选择事件
      container.querySelectorAll('.settings-select-option').forEach(option => {
        option.addEventListener('click', () => {
          const lang = option.getAttribute('data-lang') as 'zh' | 'en';
          if (lang) {
            i18n.setLanguage(lang);
            container.querySelectorAll('.settings-select-option').forEach(o => o.classList.remove('active'));
            option.classList.add('active');
            toast({ message: i18n.t(lang === 'zh' ? 'lang.switchedToZh' : 'lang.switchedToEn'), duration: 1500 });
            // 刷新整个页面以应用语言变更
            setTimeout(() => {
              this.sidebar?.render();
              this.renderSettingsTab('general');
            }, 100);
          }
        });
      });

      // 重置按钮事件
      document.getElementById('resetCategoryBtn')?.addEventListener('click', () => {
        if (confirm(i18n.t('settings.resetConfirm'))) {
          categoryManager.reset();
          toast({ message: i18n.t('settings.resetSuccess'), duration: 2000 });
        }
      });

    } else if (tab === 'theme') {
      const currentTheme = themeManager.getTheme();
      container.innerHTML = `
        <div class="settings-section-title">${i18n.t('settings.theme')}</div>
        <div class="theme-options">
          <div class="theme-option ${currentTheme === 'dark' ? 'active' : ''}" data-theme="dark">
            <div class="theme-option-radio"></div>
            <span>${i18n.t('settings.themeDark')}</span>
          </div>
          <div class="theme-option ${currentTheme === 'light' ? 'active' : ''}" data-theme="light">
            <div class="theme-option-radio"></div>
            <span>${i18n.t('settings.themeLight')}</span>
          </div>
          <div class="theme-option ${currentTheme === 'system' ? 'active' : ''}" data-theme="system">
            <div class="theme-option-radio"></div>
            <span>${i18n.t('settings.themeSystem')}</span>
          </div>
        </div>
      `;

      container.querySelectorAll('.theme-option').forEach(option => {
        option.addEventListener('click', () => {
          const theme = option.getAttribute('data-theme') as 'dark' | 'light' | 'system';
          if (theme) {
            themeManager.setTheme(theme);
            container.querySelectorAll('.theme-option').forEach(o => o.classList.remove('active'));
            option.classList.add('active');
            toast({ message: `已切换到${tabTitles[theme] || theme}主题`, duration: 1500 });
          }
        });
      });

    } else if (tab === 'about') {
      container.innerHTML = `
        <div class="about-content">
          <div class="about-logo">🛠️</div>
          <div class="about-name">ToolHub Pro</div>
          <div class="about-version">v1.0.0</div>
          <div class="about-desc">
            一站式开发工具集合，集成 AI 助手和常用开发工具，提升开发效率。
          </div>
        </div>
      `;
    }
  }

  switchTool(key: string): void {
    if (!this.container) {
      console.error('[App] Container not found');
      return;
    }

    if (!toolRegistry.has(key)) {
      console.warn(`[App] Tool "${key}" not found`);
      return;
    }

    if (this.currentKey === key) {
      return;
    }

    console.log(`[App] Switching to tool: ${key}`);

    if (this.llmContainer) {
      this.llmContainer.style.display = 'none';
    }
    this.container.style.display = 'block';

    if (this.currentKey) {
      UsageTracker.end();
    }

    if (this.currentKey && toolRegistry.has(this.currentKey)) {
      const currentTool = toolRegistry.getInstance(this.currentKey);
      currentTool?.deactivate();
    }

    const tool = toolRegistry.getInstance(key);
    if (!tool) {
      console.error(`[App] Failed to get tool instance: ${key}`);
      return;
    }

    if (!tool.mounted) {
      tool.mount(this.container);
      console.log(`[App] Tool "${key}" mounted`);
    }

    tool.activate();
    this.currentKey = key;

    UsageTracker.start(key);
    this.sidebar?.setActive(key, true);

    console.log(`[App] Tool "${key}" activated`);
  }

  getToolConfigs(): ToolConfig[] {
    return toolRegistry.getAllConfigs();
  }
}

// 创建应用实例
new App();
