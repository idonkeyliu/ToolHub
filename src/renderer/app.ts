/**
 * 应用主入口（重构版）
 */

import { toolRegistry } from './core/ToolRegistry';
import { eventBus } from './core/EventBus';
import { themeManager } from './core/ThemeManager';
import { favoriteManager } from './core/FavoriteManager';
import { categoryManager, CategoryItem } from './core/CategoryManager';
import { i18n } from './core/i18n';
import { wsService } from './core/WebSocketService';
import { EventType } from './types/index';
import { tools, UsageTracker } from './tools/index';
import { StatsPanel } from './tools/stats/StatsPanel';
import { Toast, toast } from './components/Toast';
import { Sidebar } from './components/Sidebar';
import { CommandPalette, CommandItem } from './components/CommandPalette';
import { AboutPage } from './components/AboutPage';
import { WorldMapPage } from './components/WorldMapPage';
import type { ToolConfig } from './types/index';

// 导入模块
import { weatherEffects } from './modules/WeatherEffects';
import { healthReminder } from './modules/HealthReminder';
import { settingsPanel } from './modules/SettingsPanel';
import { AddItemDialog } from './modules/AddItemDialog';
import { aiCompare } from './modules/AICompare';

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
  private addItemDialog: AddItemDialog | null = null;
  private aboutPage: AboutPage | null = null;
  private worldMapPage: WorldMapPage | null = null;

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

    // 初始化页面翻译
    i18n.initPageTranslations();

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

    // 初始化设置面板
    settingsPanel.init();
    settingsPanel.setSidebar(this.sidebar!);

    // 设置统计面板
    this.setupStats();

    // 设置全局工具栏
    this.setupGlobalToolbar();

    // 初始化 AI 对比功能
    aiCompare.init();

    // 初始化健康提醒
    healthReminder.init();

    // 设置页面卸载时保存使用数据
    this.setupUnloadHandler();

    // 隐藏并移除加载状态
    const loading = document.getElementById('loading');
    if (loading) {
      loading.style.display = 'none';
      loading.remove();
    }

    // 初始化 WebSocket 连接
    console.log(`[App] WebSocket connected: ${wsService.isConnected()}`);

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
    console.log('[App] 🚀 openDefaultItem called');
    const LAST_ITEM_KEY = 'toolhub_last_item';
    const FIRST_LAUNCH_KEY = 'toolhub_first_launch';
    
    const isFirstLaunch = !localStorage.getItem(FIRST_LAUNCH_KEY);
    console.log('[App] 🔍 isFirstLaunch:', isFirstLaunch);
    
    if (isFirstLaunch) {
      localStorage.setItem(FIRST_LAUNCH_KEY, 'true');
      console.log('[App] 👋 First launch, showing AboutPage');
      this.showAboutPage();
      return;
    }
    
    const lastItem = localStorage.getItem(LAST_ITEM_KEY);
    console.log('[App] 💾 lastItem from localStorage:', lastItem);
    
    if (lastItem === '__about__') {
      console.log('[App] 📄 Restoring AboutPage');
      this.showAboutPage();
      return;
    }
    
    if (lastItem === '__worldmap__') {
      console.log('[App] 🌍 Restoring WorldMapPage');
      this.showWorldMapPage();
      return;
    }
    
    if (lastItem && categoryManager.getItem(lastItem)) {
      console.log('[App] 🔧 Restoring tool:', lastItem);
      this.switchToItem(lastItem);
      return;
    }

    const categories = categoryManager.getCategories();
    for (const category of categories) {
      if (category.items.length > 0) {
        console.log('[App] 🎯 Opening first item:', category.items[0]);
        this.switchToItem(category.items[0]);
        return;
      }
    }

    console.log('[App] 🏠 No items found, showing AboutPage as fallback');
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
      onItemClick: (key) => {
        this.switchToItem(key);
      },
      onItemEdit: (key) => {
        this.addItemDialog?.showEdit(key, this.currentKey);
      },
      onAddItem: (categoryId) => {
        this.addItemDialog?.show(categoryId);
      },
    });
  }

  private initCommandPalette(): void {
    const items = this.buildCommandItems();
    
    this.commandPalette = new CommandPalette({
      items,
      placeholder: i18n.t('app.searchPlaceholder'),
      onSelect: (key) => {
        this.switchToItem(key);
      },
    });

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
    this.addItemDialog = new AddItemDialog({
      onItemAdded: () => {
        // 项目添加后的回调
      },
      onItemDeleted: () => {
        // 项目删除后的回调
      },
      onWebviewRemove: (key) => {
        const webview = this.webviews.get(key);
        if (webview) {
          webview.remove();
          this.webviews.delete(key);
        }
      },
      switchToItem: (key) => {
        this.switchToItem(key);
      },
    });
  }

  private switchToItem(key: string): void {
    const item = categoryManager.getItem(key);
    if (!item) {
      console.warn(`[App] Item "${key}" not found`);
      return;
    }

    this.saveLastItem(key);

    if (item.type === 'tool') {
      this.switchTool(key);
      this.updateBottomBarUrl(null);
    } else {
      this.switchWebview(key, item);
      this.updateBottomBarUrl(item.url || null);
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
    
    backBtn.classList.add('disabled');
    forwardBtn.classList.add('disabled');
  }

  private switchWebview(key: string, item: CategoryItem): void {
    if (!this.llmContainer || !this.container) return;

    if (this.currentKey) {
      UsageTracker.end();
    }

    if (this.currentKey) {
      const currentItem = categoryManager.getItem(this.currentKey);
      if (currentItem?.type === 'tool') {
        const currentTool = toolRegistry.getInstance(this.currentKey);
        currentTool?.deactivate();
      }
    }

    if (this.aboutPage) {
      this.aboutPage.hide();
    }

    this.container.style.display = 'none';
    this.llmContainer.style.display = 'block';

    this.webviews.forEach((wv, k) => {
      (wv as HTMLElement).style.display = k === key ? 'flex' : 'none';
    });

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
      const action = data.action === 'add' ? i18n.t('app.favorited') : i18n.t('app.unfavorited');
      const tool = toolRegistry.getInstance(data.key);
      if (tool) {
        toast({ message: `${tool.config.title} ${action}`, duration: 1500 });
      }
    });
  }

  private setupKeyboardShortcuts(): void {
    document.addEventListener('keydown', (e) => {
      const activeEl = document.activeElement;
      const isInputFocused = activeEl instanceof HTMLInputElement || 
                             activeEl instanceof HTMLTextAreaElement ||
                             (activeEl as HTMLElement)?.isContentEditable;
      
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
        const toolKey = TOOL_SHORTCUTS[e.key];
        if (toolKey && toolRegistry.has(toolKey) && !isInputFocused) {
          e.preventDefault();
          this.switchTool(toolKey);
          toast({ message: i18n.t('app.switchedTo', '', { name: toolRegistry.getInstance(toolKey)?.config.title || '' }), duration: 1500 });
        }
      }

      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'd' && !isInputFocused) {
        e.preventDefault();
        themeManager.toggle();
        const themeName = themeManager.getResolvedTheme() === 'dark' ? i18n.t('app.darkTheme') : i18n.t('app.lightTheme');
        toast({ message: i18n.t('app.switchedToTheme', '', { theme: themeName }), duration: 1500 });
      }

      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === 'd' && this.currentKey && !isInputFocused) {
        e.preventDefault();
        favoriteManager.toggle(this.currentKey);
      }

      if (e.key === 'Escape') {
        const settingsModal = document.getElementById('settingsModal');
        if (settingsModal?.classList.contains('show')) {
          settingsModal.classList.remove('show');
        }
        const statsModal = document.getElementById('statsModal');
        if (statsModal?.classList.contains('show')) {
          statsModal.classList.remove('show');
        }
        this.addItemDialog?.hide();
      }
    });
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
    console.log('[App] 🎯 showAboutPage called');
    if (!this.container) return;

    if (this.currentKey) {
      UsageTracker.end();
    }

    this.hideCurrentTool();

    if (this.worldMapPage) {
      this.worldMapPage.hide();
    }

    if (this.llmContainer) {
      this.llmContainer.style.display = 'none';
    }
    this.container.style.display = 'block';

    this.sidebar?.clearSelection();

    if (!this.aboutPage) {
      this.aboutPage = new AboutPage(this.container);
    }
    this.aboutPage.show();

    this.currentKey = '__about__';
  }

  private showWorldMapPage(): void {
    if (!this.container) return;

    if (this.currentKey) {
      UsageTracker.end();
    }

    this.hideCurrentTool();

    if (this.aboutPage) {
      this.aboutPage.hide();
    }

    if (this.llmContainer) {
      this.llmContainer.style.display = 'none';
    }
    this.container.style.display = 'block';

    this.sidebar?.clearSelection();

    if (!this.worldMapPage) {
      this.worldMapPage = new WorldMapPage(this.container);
    }
    this.worldMapPage.show();

    this.currentKey = '__worldmap__';
  }

  private hideCurrentTool(): void {
    const toolViews = this.container?.querySelectorAll('.tool-view');
    toolViews?.forEach(v => (v as HTMLElement).style.display = 'none');

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

    addCategoryBtn?.addEventListener('click', () => {
      this.sidebar?.showAddCategoryDialog();
    });

    addLinkBtn?.addEventListener('click', () => {
      const categories = categoryManager.getCategories();
      const firstCategory = categories[0];
      if (firstCategory) {
        this.addItemDialog?.show(firstCategory.id);
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
      const themeName = themeManager.getResolvedTheme() === 'dark' ? i18n.t('app.darkTheme') : i18n.t('app.lightTheme');
      toast({ message: i18n.t('app.switchedToTheme', '', { theme: themeName }), duration: 1500 });
    });

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
      settingsPanel.open();
    });

    // 关于页面按钮
    const aboutBtnGlobal = document.getElementById('aboutBtnGlobal');
    aboutBtnGlobal?.addEventListener('click', () => {
      this.showAboutPage();
    });

    // 世界地图页面按钮
    const worldMapBtnGlobal = document.getElementById('worldMapBtnGlobal');
    worldMapBtnGlobal?.addEventListener('click', () => {
      this.showWorldMapPage();
    });

    // 底部栏 URL 点击
    const bottomBarUrl = document.getElementById('bottomBarUrl');
    bottomBarUrl?.addEventListener('click', () => {
      const urlText = bottomBarUrl.querySelector('.bottom-bar-url-text')?.textContent;
      if (urlText) {
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
        toast({ message: i18n.t('app.pageRefreshed'), duration: 1500 });
      }
    } else if (this.currentKey) {
      const tool = toolRegistry.getInstance(this.currentKey);
      if (tool) {
        tool.deactivate();
        tool.activate();
        toast({ message: i18n.t('app.toolRefreshed'), duration: 1500 });
      }
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

    console.log(`[App] Switching to tool: ${key}, current: ${this.currentKey}`);

    if (this.currentKey === key) {
      return;
    }

    // 切换工具时，如果不是在健康休息中，停止天气效果
    if (!healthReminder.isInBreak()) {
      weatherEffects.stopAll();
    }

    if (this.aboutPage) {
      this.aboutPage.hide();
    }

    if (this.worldMapPage) {
      this.worldMapPage.hide();
    }

    if (this.llmContainer) {
      this.llmContainer.style.display = 'none';
    }
    this.container.style.display = 'block';

    if (this.currentKey) {
      UsageTracker.end();
    }

    const allToolViews = this.container.querySelectorAll('.tool-view');
    allToolViews.forEach(v => (v as HTMLElement).style.display = 'none');

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
