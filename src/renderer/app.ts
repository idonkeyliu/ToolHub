/**
 * 应用主入口（新架构）
 */

import { toolRegistry } from './core/ToolRegistry';
import { eventBus } from './core/EventBus';
import { themeManager } from './core/ThemeManager';
import { favoriteManager } from './core/FavoriteManager';
import { categoryManager, CategoryItem } from './core/CategoryManager';
import { EventType } from './types/index';
import { tools, UsageTracker } from './tools/index';
import { StatsPanel } from './tools/stats/StatsPanel';
import { Toast, toast } from './components/Toast';
import { Sidebar } from './components/Sidebar';
import { CommandPalette, CommandItem } from './components/CommandPalette';
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

    // 默认切换到第一个项目
    const categories = categoryManager.getCategories();
    const firstCategory = categories[0];
    if (firstCategory && firstCategory.items.length > 0) {
      const firstItem = categoryManager.getItem(firstCategory.items[0]);
      if (firstItem) {
        this.switchToItem(firstItem.key);
      }
    }

    console.log('[App] Initialization complete');
  }

  private registerToolsToCategory(): void {
    const allToolConfigs = toolRegistry.getAllConfigs();
    allToolConfigs.forEach(config => {
      categoryManager.registerTool(config.key, config.title, config.icon || '🔧');
    });
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
    this.addItemDialog.className = 'add-item-dialog-overlay';
    this.addItemDialog.style.display = 'none';
    this.addItemDialog.innerHTML = `
      <div class="add-item-dialog">
        <div class="add-item-dialog-header">添加项目</div>
        <div class="add-item-dialog-tabs">
          <button class="add-item-tab active" data-tab="site">网站</button>
          <button class="add-item-tab" data-tab="tool">工具</button>
        </div>
        <div class="add-item-dialog-body">
          <!-- 网站表单 -->
          <div class="add-item-form" data-form="site">
            <div class="add-item-field">
              <label>名称</label>
              <input type="text" class="site-name-input" placeholder="输入网站名称" />
            </div>
            <div class="add-item-field">
              <label>网址</label>
              <input type="text" class="site-url-input" placeholder="https://example.com" />
            </div>
            <div class="add-item-field-row">
              <div class="add-item-field">
                <label>图标</label>
                <input type="text" class="site-icon-input" placeholder="🌐" maxlength="2" />
              </div>
              <div class="add-item-field">
                <label>颜色</label>
                <input type="color" class="site-color-input" value="#3b82f6" />
              </div>
            </div>
          </div>
          <!-- 工具选择 -->
          <div class="add-item-form" data-form="tool" style="display:none">
            <div class="add-item-tool-list"></div>
          </div>
        </div>
        <div class="add-item-dialog-footer">
          <button class="add-item-cancel">取消</button>
          <button class="add-item-confirm">确定</button>
        </div>
      </div>
    `;

    // 标签切换
    const tabs = this.addItemDialog.querySelectorAll('.add-item-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const tabName = tab.getAttribute('data-tab');
        this.addItemDialog?.querySelectorAll('.add-item-form').forEach(form => {
          (form as HTMLElement).style.display = form.getAttribute('data-form') === tabName ? 'block' : 'none';
        });
      });
    });

    // 取消按钮
    this.addItemDialog.querySelector('.add-item-cancel')?.addEventListener('click', () => {
      this.hideAddItemDialog();
    });

    // 点击遮罩关闭
    this.addItemDialog.addEventListener('click', (e) => {
      if (e.target === this.addItemDialog) {
        this.hideAddItemDialog();
      }
    });

    // 确定按钮
    this.addItemDialog.querySelector('.add-item-confirm')?.addEventListener('click', () => {
      this.confirmAddItem();
    });

    document.body.appendChild(this.addItemDialog);
  }

  private showAddItemDialog(categoryId: string): void {
    this.addItemTargetCategory = categoryId;
    if (!this.addItemDialog) return;

    // 重置表单
    const nameInput = this.addItemDialog.querySelector('.site-name-input') as HTMLInputElement;
    const urlInput = this.addItemDialog.querySelector('.site-url-input') as HTMLInputElement;
    const iconInput = this.addItemDialog.querySelector('.site-icon-input') as HTMLInputElement;
    const colorInput = this.addItemDialog.querySelector('.site-color-input') as HTMLInputElement;

    if (nameInput) nameInput.value = '';
    if (urlInput) urlInput.value = '';
    if (iconInput) iconInput.value = '';
    if (colorInput) colorInput.value = '#3b82f6';

    // 渲染工具列表（未分配到当前目录的工具）
    this.renderToolList();

    // 显示对话框
    this.addItemDialog.style.display = 'flex';

    // 聚焦到名称输入框
    setTimeout(() => nameInput?.focus(), 0);
  }

  private hideAddItemDialog(): void {
    if (this.addItemDialog) {
      this.addItemDialog.style.display = 'none';
    }
    this.addItemTargetCategory = null;
  }

  private renderToolList(): void {
    const toolList = this.addItemDialog?.querySelector('.add-item-tool-list');
    if (!toolList) return;

    const targetCategory = this.addItemTargetCategory;
    if (!targetCategory) return;

    // 获取当前目录已有的项目
    const category = categoryManager.getCategory(targetCategory);
    const existingItems = new Set(category?.items || []);

    // 获取所有工具
    const allItems = categoryManager.getAllItems();
    const availableTools = allItems.filter(item => 
      item.type === 'tool' && !existingItems.has(item.key)
    );

    if (availableTools.length === 0) {
      toolList.innerHTML = '<div class="no-tools-hint">所有工具都已添加到此目录</div>';
      return;
    }

    toolList.innerHTML = availableTools.map(tool => `
      <div class="tool-select-item" data-key="${tool.key}">
        <span class="tool-select-icon" style="background:${tool.color}">${tool.icon}</span>
        <span class="tool-select-name">${tool.title}</span>
      </div>
    `).join('');

    // 点击选择工具
    toolList.querySelectorAll('.tool-select-item').forEach(item => {
      item.addEventListener('click', () => {
        item.classList.toggle('selected');
      });
    });
  }

  private confirmAddItem(): void {
    if (!this.addItemTargetCategory) return;

    const activeTab = this.addItemDialog?.querySelector('.add-item-tab.active');
    const tabName = activeTab?.getAttribute('data-tab');

    if (tabName === 'site') {
      // 添加网站
      const nameInput = this.addItemDialog?.querySelector('.site-name-input') as HTMLInputElement;
      const urlInput = this.addItemDialog?.querySelector('.site-url-input') as HTMLInputElement;
      const iconInput = this.addItemDialog?.querySelector('.site-icon-input') as HTMLInputElement;
      const colorInput = this.addItemDialog?.querySelector('.site-color-input') as HTMLInputElement;

      const name = nameInput?.value.trim();
      let url = urlInput?.value.trim();
      const icon = iconInput?.value.trim() || '🌐';
      const color = colorInput?.value || '#3b82f6';

      if (!name || !url) {
        toast({ message: '请填写名称和网址', duration: 2000 });
        return;
      }

      // 自动补全 https
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }

      const item = categoryManager.addCustomSite(name, url, icon, color, this.addItemTargetCategory);
      toast({ message: `已添加「${name}」`, duration: 2000 });
      this.hideAddItemDialog();
      this.switchToItem(item.key);

    } else if (tabName === 'tool') {
      // 添加工具
      const selectedTools = this.addItemDialog?.querySelectorAll('.tool-select-item.selected');
      if (!selectedTools || selectedTools.length === 0) {
        toast({ message: '请选择要添加的工具', duration: 2000 });
        return;
      }

      selectedTools.forEach(item => {
        const key = item.getAttribute('data-key');
        if (key) {
          categoryManager.moveItem(key, this.addItemTargetCategory!);
        }
      });

      toast({ message: `已添加 ${selectedTools.length} 个工具`, duration: 2000 });
      this.hideAddItemDialog();
    }
  }

  private editCustomSite(key: string): void {
    const item = categoryManager.getItem(key);
    if (!item || item.type !== 'custom-site') return;

    const dialog = document.createElement('div');
    dialog.className = 'add-item-dialog-overlay';
    dialog.innerHTML = `
      <div class="add-item-dialog">
        <div class="add-item-dialog-header">编辑网站</div>
        <div class="add-item-dialog-body">
          <div class="add-item-form">
            <div class="add-item-field">
              <label>名称</label>
              <input type="text" class="site-name-input" value="${item.title}" />
            </div>
            <div class="add-item-field">
              <label>网址</label>
              <input type="text" class="site-url-input" value="${item.url || ''}" />
            </div>
            <div class="add-item-field-row">
              <div class="add-item-field">
                <label>图标</label>
                <input type="text" class="site-icon-input" value="${item.icon}" maxlength="2" />
              </div>
              <div class="add-item-field">
                <label>颜色</label>
                <input type="color" class="site-color-input" value="${item.color}" />
              </div>
            </div>
          </div>
        </div>
        <div class="add-item-dialog-footer">
          <button class="edit-site-delete">删除</button>
          <div style="flex:1"></div>
          <button class="add-item-cancel">取消</button>
          <button class="add-item-confirm">保存</button>
        </div>
      </div>
    `;

    const nameInput = dialog.querySelector('.site-name-input') as HTMLInputElement;
    const urlInput = dialog.querySelector('.site-url-input') as HTMLInputElement;
    const iconInput = dialog.querySelector('.site-icon-input') as HTMLInputElement;
    const colorInput = dialog.querySelector('.site-color-input') as HTMLInputElement;

    dialog.querySelector('.add-item-cancel')?.addEventListener('click', () => dialog.remove());
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

    dialog.querySelector('.add-item-confirm')?.addEventListener('click', () => {
      const name = nameInput?.value.trim();
      let url = urlInput?.value.trim();
      const icon = iconInput?.value.trim();
      const color = colorInput?.value;

      if (!name || !url) {
        toast({ message: '请填写名称和网址', duration: 2000 });
        return;
      }

      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }

      categoryManager.updateCustomSite(key, { title: name, url, icon, color });
      
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

    if (item.type === 'tool') {
      this.switchTool(key);
    } else {
      // LLM 或自定义网站
      this.switchWebview(key, item);
    }
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
        const modal = document.getElementById('settingsModal');
        if (modal?.classList.contains('show')) {
          modal.classList.remove('show');
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
      general: '通用',
      theme: '主题',
      about: '关于'
    };

    if (titleEl) {
      titleEl.textContent = tabTitles[tab] || tab;
    }

    if (tab === 'general') {
      container.innerHTML = `
        <div class="settings-section-title">数据管理</div>
        <button class="settings-danger-btn" id="resetCategoryBtn">重置目录和工具分配</button>
      `;

      document.getElementById('resetCategoryBtn')?.addEventListener('click', () => {
        if (confirm('确定要重置所有目录和工具分配吗？自定义网站将被删除。')) {
          categoryManager.reset();
          toast({ message: '已重置', duration: 2000 });
        }
      });

    } else if (tab === 'theme') {
      const currentTheme = themeManager.getTheme();
      container.innerHTML = `
        <div class="settings-section-title">外观</div>
        <div class="theme-options">
          <div class="theme-option ${currentTheme === 'dark' ? 'active' : ''}" data-theme="dark">
            <div class="theme-option-radio"></div>
            <span>黑暗</span>
          </div>
          <div class="theme-option ${currentTheme === 'light' ? 'active' : ''}" data-theme="light">
            <div class="theme-option-radio"></div>
            <span>明亮</span>
          </div>
          <div class="theme-option ${currentTheme === 'system' ? 'active' : ''}" data-theme="system">
            <div class="theme-option-radio"></div>
            <span>系统</span>
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
