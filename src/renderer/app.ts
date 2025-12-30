/**
 * 应用主入口（新架构）
 */

import { toolRegistry } from './core/ToolRegistry';
import { eventBus } from './core/EventBus';
import { themeManager } from './core/ThemeManager';
import { favoriteManager } from './core/FavoriteManager';
import { customSiteManager, CustomSite, CUSTOM_SITE_CATEGORIES } from './core/CustomSiteManager';
import { EventType } from './types/index';
import { tools, UsageTracker } from './tools/index';
import { StatsPanel } from './tools/stats/StatsPanel';
import { Toast, toast } from './components/Toast';
import { Sidebar, SidebarCategory } from './components/Sidebar';
import { CommandPalette, CommandItem } from './components/CommandPalette';
import { CustomSiteModal } from './components/CustomSiteModal';
import type { ToolConfig } from './types/index';

/** LLM 站点定义 */
interface LLMSite {
  key: string;
  title: string;
  shortTitle: string;
  icon: string;
  color: string;
}

/** LLM 站点列表（与 main.ts 中的 sites 保持一致） */
const LLM_SITES: LLMSite[] = [
  { key: 'openai', title: 'OpenAI', shortTitle: 'OpenAI', icon: 'OP', color: '#10a37f' },
  { key: 'lmarena', title: 'LMArena', shortTitle: 'LMArena', icon: 'LM', color: '#6366f1' },
  { key: 'gemini', title: 'Gemini', shortTitle: 'Gemini', icon: 'GE', color: '#4285f4' },
  { key: 'aistudio', title: 'AI Studio', shortTitle: 'AIStudio', icon: 'AI', color: '#ea4335' },
  { key: 'deepseek', title: 'DeepSeek', shortTitle: 'DeepSeek', icon: 'DE', color: '#0066ff' },
  { key: 'kimi', title: 'Kimi', shortTitle: 'Kimi', icon: 'Ki', color: '#6b5ce7' },
  { key: 'grok', title: 'Grok', shortTitle: 'Grok', icon: 'GR', color: '#1da1f2' },
  { key: 'claude', title: 'Claude', shortTitle: 'Claude', icon: 'CL', color: '#d97706' },
  { key: 'qianwen', title: '通义千问', shortTitle: '千问', icon: '千', color: '#6236ff' },
  { key: 'doubao', title: '豆包', shortTitle: '豆包', icon: '豆', color: '#00d4aa' },
  { key: 'yuanbao', title: '腾讯元宝', shortTitle: '元宝', icon: '元', color: '#0052d9' },
];

/** 海外大模型 */
const OVERSEAS_LLM_KEYS = ['openai', 'claude', 'gemini', 'aistudio', 'grok', 'lmarena'];

/** 国内大模型 */
const DOMESTIC_LLM_KEYS = ['deepseek', 'kimi', 'qianwen', 'doubao', 'yuanbao'];

/** 工具分类映射 */
const TOOL_CATEGORIES: Record<string, { title: string; icon: string; keys: string[] }> = {
  utility: {
    title: '实用工具',
    icon: '🧰',
    keys: ['time', 'pwd', 'calc', 'color', 'calendar', 'currency', 'image'],
  },
  encoding: {
    title: '编解码工具',
    icon: '🔐',
    keys: ['codec', 'crypto', 'jwt'],
  },
  format: {
    title: '格式化工具',
    icon: '📝',
    keys: ['json', 'text', 'diff', 'regex'],
  },
  storage: {
    title: '存储工具',
    icon: '💾',
    keys: ['database', 'redis', 'mongo'],
  },
  network: {
    title: '网络工具',
    icon: '🌐',
    keys: ['dns', 'curl'],
  },
  terminal: {
    title: '终端工具',
    icon: '🖥️',
    keys: ['terminal', 'sync'],
  },
};

/** 工具图标颜色映射 */
const TOOL_COLORS: Record<string, string> = {
  time: '#f59e0b',
  pwd: '#ef4444',
  text: '#8b5cf6',
  calc: '#06b6d4',
  json: '#22c55e',
  codec: '#3b82f6',
  crypto: '#ec4899',
  dns: '#14b8a6',
  curl: '#f97316',
  color: '#a855f7',
  calendar: '#6366f1',
  currency: '#10b981',
  image: '#0ea5e9',
  database: '#f472b6',
  redis: '#dc2626',
  mongo: '#00ed64',
  diff: '#7c3aed',
  jwt: '#d946ef',
  regex: '#0891b2',
};

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

/** 导航可见性设置存储 key */
const NAV_VISIBILITY_KEY = 'toolhub_nav_visibility';

/** 导航可见性设置 */
interface NavVisibility {
  llm: Record<string, boolean>;
  tools: Record<string, boolean>;
  customSites?: Record<string, boolean>;
}

class App {
  private currentKey: string | null = null;
  private currentLLM: string | null = null;
  private container: HTMLElement | null = null;
  private llmContainer: HTMLElement | null = null;
  private webviews: Map<string, HTMLElement> = new Map();
  private navVisibility: NavVisibility = { llm: {}, tools: {} };
  private statsPanel: StatsPanel | null = null;
  private sidebar: Sidebar | null = null;
  private commandPalette: CommandPalette | null = null;
  private customSiteModal: CustomSiteModal | null = null;

  constructor() {
    // 等待 DOM 加载完成
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.init());
    } else {
      this.init();
    }
  }

  private init(): void {
    console.log('[App] Initializing...');

    // 1. 获取 DOM 元素
    this.container = document.getElementById('mainContainer');
    this.llmContainer = document.getElementById('llmContainer');
    const sidebarEl = document.getElementById('sidebar');

    if (!this.container || !sidebarEl) {
      console.error('[App] Required DOM elements not found');
      return;
    }

    // 2. 加载导航可见性设置
    this.loadNavVisibility();

    // 3. 注册所有工具
    toolRegistry.registerAll(tools);
    console.log(`[App] Registered ${toolRegistry.size} tools`);

    // 4. 初始化 Toast 组件
    Toast.getInstance();

    // 5. 初始化主题
    console.log(`[App] Theme: ${themeManager.getResolvedTheme()}`);

    // 6. 初始化左侧边栏
    this.initSidebar(sidebarEl);

    // 7. 初始化 Command Palette
    this.initCommandPalette();

    // 8. 初始化自定义网站弹窗
    this.initCustomSiteModal();

    // 9. 监听事件
    this.setupEventListeners();

    // 9. 设置快捷键
    this.setupKeyboardShortcuts();

    // 10. 设置设置面板
    this.setupSettings();

    // 11. 设置统计面板
    this.setupStats();

    // 12. 设置添加网站按钮
    this.setupAddSiteButton();

    // 13. 设置搜索按钮
    this.setupSearchButton();

    // 14. 设置全局工具栏
    this.setupGlobalToolbar();

    // 15. 设置页面卸载时保存使用数据
    this.setupUnloadHandler();

    // 14. 隐藏加载状态
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'none';

    // 15. 默认切换到 OpenAI
    const firstLLM = LLM_SITES.find(site => this.isLLMVisible(site.key));
    if (firstLLM) {
      this.switchLLM(firstLLM.key);
    } else {
      // 如果没有可见的 LLM，则切换到第一个可见的工具
      const firstTool = toolRegistry.getAllConfigs().find(t => this.isToolVisible(t.key));
      if (firstTool) {
        this.switchTool(firstTool.key);
      }
    }

    console.log('[App] Initialization complete');
  }

  private initSidebar(container: HTMLElement): void {
    const categories = this.buildSidebarCategories();
    
    this.sidebar = new Sidebar(container, {
      categories,
      onItemClick: (key, category) => {
        // 判断是 LLM 还是工具还是自定义网站
        if (category === 'overseas-llm' || category === 'domestic-llm') {
          this.switchLLM(key);
        } else if (category.startsWith('custom-') || category === 'custom-sites') {
          this.switchCustomSite(key);
        } else {
          this.switchTool(key);
        }
      },
      onAddCustomSite: () => {
        this.customSiteModal?.open();
      },
      onEditCustomSite: (id) => {
        this.customSiteModal?.edit(id);
      },
      onSearch: () => {
        this.commandPalette?.open();
      },
      onStats: () => {
        this.openStats();
      },
      onSettings: () => {
        this.openSettings();
      },
      onRefresh: () => {
        this.refreshCurrentPage();
      },
    });
  }

  private buildSidebarCategories(): SidebarCategory[] {
    const categories: SidebarCategory[] = [];

    // 海外大模型
    const overseasLLMs = LLM_SITES
      .filter(site => OVERSEAS_LLM_KEYS.includes(site.key) && this.isLLMVisible(site.key))
      .map(site => ({
        key: site.key,
        title: site.title,
        shortTitle: site.shortTitle,
        icon: site.icon,
        color: site.color,
      }));

    if (overseasLLMs.length > 0) {
      categories.push({
        key: 'overseas-llm',
        title: '海外大模型',
        icon: '🌍',
        items: overseasLLMs,
      });
    }

    // 国内大模型
    const domesticLLMs = LLM_SITES
      .filter(site => DOMESTIC_LLM_KEYS.includes(site.key) && this.isLLMVisible(site.key))
      .map(site => ({
        key: site.key,
        title: site.title,
        shortTitle: site.shortTitle,
        icon: site.icon,
        color: site.color,
      }));

    if (domesticLLMs.length > 0) {
      categories.push({
        key: 'domestic-llm',
        title: '国内大模型',
        icon: '🇨🇳',
        items: domesticLLMs,
      });
    }

    // 自定义网站（按分类分组）
    const allCustomSites = customSiteManager.getAll();
    
    CUSTOM_SITE_CATEGORIES.forEach(cat => {
      const sitesInCategory = allCustomSites
        .filter(site => (site.category || 'other') === cat.key && this.isCustomSiteVisible(site.id))
        .map(site => ({
          key: site.id,
          title: site.name,
          icon: site.icon || site.name.slice(0, 2),
          color: site.color,
          isCustom: true,
        }));

      // 只有有网站时才显示分类
      if (sitesInCategory.length > 0) {
        categories.push({
          key: `custom-${cat.key}`,
          title: cat.label,
          icon: cat.icon,
          items: sitesInCategory,
          showAddButton: false, // 添加按钮已移到顶部
        });
      }
    });

    // 工具分类
    const allToolConfigs = toolRegistry.getAllConfigs();
    
    Object.entries(TOOL_CATEGORIES).forEach(([catKey, catConfig]) => {
      const toolItems = catConfig.keys
        .map(key => allToolConfigs.find(c => c.key === key))
        .filter((config): config is ToolConfig => config !== undefined && this.isToolVisible(config.key))
        .map(config => ({
          key: config.key,
          title: config.title,
          icon: config.icon || '🔧',
          color: TOOL_COLORS[config.key] || '#6b7280',
        }));

      if (toolItems.length > 0) {
        categories.push({
          key: catKey,
          title: catConfig.title,
          icon: catConfig.icon,
          items: toolItems,
        });
      }
    });

    // 未分类的工具
    const categorizedKeys = Object.values(TOOL_CATEGORIES).flatMap(c => c.keys);
    const uncategorizedTools = allToolConfigs
      .filter(config => !categorizedKeys.includes(config.key) && this.isToolVisible(config.key))
      .map(config => ({
        key: config.key,
        title: config.title,
        icon: config.icon || '🔧',
        color: TOOL_COLORS[config.key] || '#6b7280',
      }));

    if (uncategorizedTools.length > 0) {
      categories.push({
        key: 'other-tools',
        title: '其他工具',
        icon: '📦',
        items: uncategorizedTools,
      });
    }

    return categories;
  }

  private initCommandPalette(): void {
    const items = this.buildCommandItems();
    
    this.commandPalette = new CommandPalette({
      items,
      placeholder: '搜索工具或 AI 助手...',
      onSelect: (key) => {
        // 判断是 LLM、自定义网站还是工具
        const isLLM = LLM_SITES.some(site => site.key === key);
        const isCustomSite = customSiteManager.get(key) !== undefined;
        if (isLLM) {
          this.switchLLM(key);
        } else if (isCustomSite) {
          this.switchCustomSite(key);
        } else {
          this.switchTool(key);
        }
      },
    });
  }

  private initCustomSiteModal(): void {
    this.customSiteModal = new CustomSiteModal({
      onSave: (site) => {
        this.refreshNavigation();
        toast({ message: `已保存「${site.name}」`, duration: 2000 });
        // 切换到新添加的网站
        this.switchCustomSite(site.id);
      },
      onDelete: (id) => {
        // 如果删除的是当前显示的网站，切换到其他
        if (this.currentKey === id) {
          const firstLLM = LLM_SITES.find(site => this.isLLMVisible(site.key));
          if (firstLLM) {
            this.switchLLM(firstLLM.key);
          }
        }
        // 删除 webview
        const webview = this.webviews.get(id);
        if (webview) {
          webview.remove();
          this.webviews.delete(id);
        }
        this.refreshNavigation();
        toast({ message: '已删除自定义网站', duration: 2000 });
      },
    });

    // 订阅自定义网站变化
    customSiteManager.subscribe(() => {
      this.refreshNavigation();
    });
  }

  private buildCommandItems(): CommandItem[] {
    const items: CommandItem[] = [];

    // 海外大模型
    LLM_SITES
      .filter(site => OVERSEAS_LLM_KEYS.includes(site.key) && this.isLLMVisible(site.key))
      .forEach(site => {
        items.push({
          key: site.key,
          title: site.title,
          icon: site.icon,
          color: site.color,
          category: '海外大模型',
          keywords: ['llm', 'ai', 'chat', 'overseas', site.shortTitle.toLowerCase()],
        });
      });

    // 国内大模型
    LLM_SITES
      .filter(site => DOMESTIC_LLM_KEYS.includes(site.key) && this.isLLMVisible(site.key))
      .forEach(site => {
        items.push({
          key: site.key,
          title: site.title,
          icon: site.icon,
          color: site.color,
          category: '国内大模型',
          keywords: ['llm', 'ai', 'chat', 'domestic', '国内', site.shortTitle.toLowerCase()],
        });
      });

    // 自定义网站
    customSiteManager.getAll()
      .filter(site => this.isCustomSiteVisible(site.id))
      .forEach(site => {
        const categoryInfo = CUSTOM_SITE_CATEGORIES.find(c => c.key === (site.category || 'other'));
        items.push({
          key: site.id,
          title: site.name,
          icon: site.icon || site.name.slice(0, 2),
          color: site.color,
          category: categoryInfo?.label || '自定义网站',
          keywords: ['custom', '自定义', site.name.toLowerCase(), site.url.toLowerCase()],
        });
      });

    // 工具项目（按分类）
    const allToolConfigs = toolRegistry.getAllConfigs();
    
    Object.entries(TOOL_CATEGORIES).forEach(([, catConfig]) => {
      catConfig.keys.forEach(key => {
        const config = allToolConfigs.find(c => c.key === key);
        if (config && this.isToolVisible(config.key)) {
          items.push({
            key: config.key,
            title: config.title,
            icon: config.icon || '🔧',
            color: TOOL_COLORS[config.key] || '#6b7280',
            category: catConfig.title,
            keywords: config.keywords || [],
          });
        }
      });
    });

    // 未分类的工具
    const categorizedKeys = Object.values(TOOL_CATEGORIES).flatMap(c => c.keys);
    allToolConfigs
      .filter(config => !categorizedKeys.includes(config.key) && this.isToolVisible(config.key))
      .forEach(config => {
        items.push({
          key: config.key,
          title: config.title,
          icon: config.icon || '🔧',
          color: TOOL_COLORS[config.key] || '#6b7280',
          category: '其他工具',
          keywords: config.keywords || [],
        });
      });

    return items;
  }

  private setupSearchButton(): void {
    // 搜索按钮已移到 Sidebar 底部，这里不再需要
  }

  private setupUnloadHandler(): void {
    // 页面关闭/刷新时保存使用数据
    window.addEventListener('beforeunload', () => {
      UsageTracker.end();
    });

    // 页面可见性变化时也保存（切换到后台）
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.currentKey) {
        UsageTracker.end();
      } else if (!document.hidden && this.currentKey) {
        UsageTracker.start(this.currentKey);
      }
    });
  }

  private loadNavVisibility(): void {
    try {
      const saved = localStorage.getItem(NAV_VISIBILITY_KEY);
      if (saved) {
        this.navVisibility = JSON.parse(saved);
      }
    } catch (e) {
      console.warn('[App] Failed to load nav visibility settings');
    }

    // 初始化默认值（全部显示）
    LLM_SITES.forEach(site => {
      if (this.navVisibility.llm[site.key] === undefined) {
        this.navVisibility.llm[site.key] = true;
      }
    });
  }

  private saveNavVisibility(): void {
    try {
      localStorage.setItem(NAV_VISIBILITY_KEY, JSON.stringify(this.navVisibility));
    } catch (e) {
      console.warn('[App] Failed to save nav visibility settings');
    }
  }

  private isLLMVisible(key: string): boolean {
    return this.navVisibility.llm[key] !== false;
  }

  private isToolVisible(key: string): boolean {
    return this.navVisibility.tools[key] !== false;
  }

  private toggleLLMVisibility(key: string): void {
    this.navVisibility.llm[key] = !this.isLLMVisible(key);
    this.saveNavVisibility();
    this.refreshNavigation();
    this.renderSettingsList();
  }

  private toggleToolVisibility(key: string): void {
    this.navVisibility.tools[key] = !this.isToolVisible(key);
    this.saveNavVisibility();
    this.refreshNavigation();
    this.renderSettingsList();
  }

  private isCustomSiteVisible(key: string): boolean {
    return this.navVisibility.customSites?.[key] !== false;
  }

  private toggleCustomSiteVisibility(key: string): void {
    if (!this.navVisibility.customSites) {
      this.navVisibility.customSites = {};
    }
    this.navVisibility.customSites[key] = !this.isCustomSiteVisible(key);
    this.saveNavVisibility();
    this.refreshNavigation();
    this.renderSettingsList();
  }

  private refreshNavigation(): void {
    // 更新边栏
    if (this.sidebar) {
      this.sidebar.updateCategories(this.buildSidebarCategories());
      this.sidebar.setActive(this.currentKey);
    }
    // 更新 Command Palette
    if (this.commandPalette) {
      this.commandPalette.updateItems(this.buildCommandItems());
    }
  }

  private switchLLM(key: string): void {
    if (!this.llmContainer || !this.container) return;

    // 结束工具使用追踪
    if (this.currentKey) {
      UsageTracker.end();
    }

    // 失活当前工具
    if (this.currentKey && !LLM_SITES.some(s => s.key === this.currentKey)) {
      const currentTool = toolRegistry.getInstance(this.currentKey);
      currentTool?.deactivate();
    }

    // 隐藏工具容器，显示 LLM 容器
    this.container.style.display = 'none';
    this.llmContainer.style.display = 'block';

    // 隐藏其他 webview
    this.webviews.forEach((wv, k) => {
      if (k === key) {
        (wv as HTMLElement).style.display = 'flex';
      } else {
        (wv as HTMLElement).style.display = 'none';
      }
    });

    // 创建 webview（如果不存在）
    if (!this.webviews.has(key)) {
      const site = LLM_SITES.find(s => s.key === key);
      if (site) {
        this.createWebview(key);
      }
    }

    this.currentLLM = key;
    this.currentKey = key;
    
    // 更新边栏高亮并滚动到选中项
    this.sidebar?.setActive(key, true);
    
    // 开始 LLM 使用追踪
    UsageTracker.start(key);
  }

  /** 切换到自定义网站 */
  private switchCustomSite(id: string): void {
    if (!this.llmContainer || !this.container) return;

    const site = customSiteManager.get(id);
    if (!site) {
      console.warn(`[App] Custom site "${id}" not found`);
      return;
    }

    // 结束工具使用追踪
    if (this.currentKey) {
      UsageTracker.end();
    }

    // 失活当前工具
    if (this.currentKey && !LLM_SITES.some(s => s.key === this.currentKey) && !customSiteManager.get(this.currentKey)) {
      const currentTool = toolRegistry.getInstance(this.currentKey);
      currentTool?.deactivate();
    }

    // 隐藏工具容器，显示 LLM 容器
    this.container.style.display = 'none';
    this.llmContainer.style.display = 'block';

    // 隐藏其他 webview
    this.webviews.forEach((wv, k) => {
      if (k === id) {
        (wv as HTMLElement).style.display = 'flex';
      } else {
        (wv as HTMLElement).style.display = 'none';
      }
    });

    // 创建 webview（如果不存在）
    if (!this.webviews.has(id)) {
      this.createCustomWebview(id, site.url);
    }

    this.currentLLM = null;
    this.currentKey = id;
    
    // 更新边栏高亮并滚动到选中项
    this.sidebar?.setActive(id, true);
    
    // 开始使用追踪
    UsageTracker.start(id);
  }

  /** 创建自定义网站的 webview */
  private createCustomWebview(id: string, url: string): void {
    if (!this.llmContainer) return;

    const webview = document.createElement('webview');
    webview.setAttribute('src', url);
    webview.setAttribute('partition', `persist:custom_${id}`);
    webview.setAttribute('allowpopups', 'true');
    webview.className = 'llm-webview';
    webview.style.cssText = 'width: 100%; height: 100%; display: flex;';

    this.llmContainer.appendChild(webview);
    this.webviews.set(id, webview);
  }

  private createWebview(key: string): void {
    if (!this.llmContainer) return;

    const urls: Record<string, string> = {
      openai: 'https://chat.openai.com',
      lmarena: 'https://lmarena.ai/',
      gemini: 'https://gemini.google.com',
      aistudio: 'https://aistudio.google.com',
      deepseek: 'https://chat.deepseek.com',
      kimi: 'https://kimi.moonshot.cn',
      grok: 'https://grok.com',
      claude: 'https://claude.ai',
      qianwen: 'https://tongyi.aliyun.com/qianwen',
      doubao: 'https://www.doubao.com/chat',
      yuanbao: 'https://yuanbao.tencent.com/chat',
    };

    const webview = document.createElement('webview');
    webview.setAttribute('src', urls[key] || '');
    webview.setAttribute('partition', `persist:${key}`);
    webview.setAttribute('allowpopups', 'true');
    webview.className = 'llm-webview';
    webview.style.cssText = 'width: 100%; height: 100%; display: flex;';

    this.llmContainer.appendChild(webview);
    this.webviews.set(key, webview);
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
      // Cmd/Ctrl + 数字键 切换工具
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
        const toolKey = TOOL_SHORTCUTS[e.key];
        if (toolKey && toolRegistry.has(toolKey)) {
          e.preventDefault();
          this.switchTool(toolKey);
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

      // ESC 关闭设置面板
      if (e.key === 'Escape') {
        const modal = document.getElementById('settingsModal');
        if (modal?.classList.contains('show')) {
          modal.classList.remove('show');
        }
      }
    });
  }

  private setupSettings(): void {
    const settingsModal = document.getElementById('settingsModal');
    const settingsClose = document.getElementById('settingsClose');

    if (!settingsModal || !settingsClose) return;

    // 关闭设置
    settingsClose.addEventListener('click', () => {
      settingsModal.classList.remove('show');
    });

    // 点击遮罩关闭
    settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal) {
        settingsModal.classList.remove('show');
      }
    });
  }

  private openSettings(): void {
    const settingsModal = document.getElementById('settingsModal');
    if (settingsModal) {
      this.renderSettingsList();
      settingsModal.classList.add('show');
    }
  }

  private setupStats(): void {
    const statsModal = document.getElementById('statsModal');
    const statsClose = document.getElementById('statsClose');

    if (!statsModal || !statsClose) return;

    // 关闭统计面板
    statsClose.addEventListener('click', () => {
      statsModal.classList.remove('show');
    });

    // 点击遮罩关闭
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

  private setupAddSiteButton(): void {
    // 按钮已移到全局底部栏，这里不再需要
  }

  private setupGlobalToolbar(): void {
    // 顶部工具栏
    const toggleSidebarBtn = document.getElementById('toggleSidebarBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    const expandSidebarBtn = document.getElementById('expandSidebarBtn');
    const sidebarArea = document.getElementById('sidebarArea');

    // 更新侧边栏区域和展开按钮的显示状态
    const updateSidebarAreaState = () => {
      const isCollapsed = this.sidebar?.isCollapsed();
      if (sidebarArea) {
        sidebarArea.classList.toggle('collapsed', isCollapsed || false);
      }
      if (expandSidebarBtn) {
        expandSidebarBtn.style.display = isCollapsed ? 'flex' : 'none';
      }
      // 控制红绿灯按钮显示/隐藏
      (window as any).llmHub?.setTrafficLightVisibility?.(!isCollapsed);
    };

    toggleSidebarBtn?.addEventListener('click', () => {
      this.sidebar?.toggleCollapse();
      updateSidebarAreaState();
    });

    refreshBtn?.addEventListener('click', () => {
      this.refreshCurrentPage();
    });

    // 底部展开按钮
    expandSidebarBtn?.addEventListener('click', () => {
      this.sidebar?.toggleCollapse();
      updateSidebarAreaState();
    });

    // 初始化状态
    updateSidebarAreaState();

    // 底部功能栏
    const searchBtnGlobal = document.getElementById('searchBtnGlobal');
    const addSiteBtnGlobal = document.getElementById('addSiteBtnGlobal');
    const statsBtnGlobal = document.getElementById('statsBtnGlobal');
    const settingsBtnGlobal = document.getElementById('settingsBtnGlobal');

    searchBtnGlobal?.addEventListener('click', () => {
      this.commandPalette?.open();
    });

    addSiteBtnGlobal?.addEventListener('click', () => {
      this.customSiteModal?.open();
    });

    statsBtnGlobal?.addEventListener('click', () => {
      this.openStats();
    });

    settingsBtnGlobal?.addEventListener('click', () => {
      this.openSettings();
    });
  }

  private refreshCurrentPage(): void {
    // 如果当前是 LLM 或自定义网站，刷新 webview
    if (this.currentKey && this.webviews.has(this.currentKey)) {
      const webview = this.webviews.get(this.currentKey) as any;
      if (webview && typeof webview.reload === 'function') {
        webview.reload();
        toast({ message: '页面已刷新', duration: 1500 });
      }
    } else if (this.currentKey) {
      // 如果是工具，重新激活
      const tool = toolRegistry.getInstance(this.currentKey);
      if (tool) {
        tool.deactivate();
        tool.activate();
        toast({ message: '工具已刷新', duration: 1500 });
      }
    }
  }

  private renderSettingsList(): void {
    const container = document.getElementById('settingsBody');
    if (!container) return;

    container.innerHTML = '';

    // 海外大模型
    const overseasLLMs = LLM_SITES.filter(site => OVERSEAS_LLM_KEYS.includes(site.key));
    if (overseasLLMs.length > 0) {
      this.renderSettingsSection(container, '🌍 海外大模型', overseasLLMs.map(site => ({
        key: site.key,
        title: site.title,
        icon: site.icon,
        color: site.color,
        visible: this.isLLMVisible(site.key),
        type: 'llm' as const,
      })));
    }

    // 国内大模型
    const domesticLLMs = LLM_SITES.filter(site => DOMESTIC_LLM_KEYS.includes(site.key));
    if (domesticLLMs.length > 0) {
      this.renderSettingsSection(container, '🇨🇳 国内大模型', domesticLLMs.map(site => ({
        key: site.key,
        title: site.title,
        icon: site.icon,
        color: site.color,
        visible: this.isLLMVisible(site.key),
        type: 'llm' as const,
      })));
    }

    // 工具分类
    const allToolConfigs = toolRegistry.getAllConfigs();
    
    Object.entries(TOOL_CATEGORIES).forEach(([, catConfig]) => {
      const tools = catConfig.keys
        .map(key => allToolConfigs.find(c => c.key === key))
        .filter((config): config is ToolConfig => config !== undefined);
      
      if (tools.length > 0) {
        this.renderSettingsSection(container, `${catConfig.icon} ${catConfig.title}`, tools.map(config => ({
          key: config.key,
          title: config.title,
          icon: config.icon || '🔧',
          color: TOOL_COLORS[config.key] || '#6b7280',
          visible: this.isToolVisible(config.key),
          type: 'tool' as const,
        })));
      }
    });

    // 未分类的工具
    const categorizedKeys = Object.values(TOOL_CATEGORIES).flatMap(c => c.keys);
    const uncategorizedTools = allToolConfigs.filter(config => !categorizedKeys.includes(config.key));
    
    if (uncategorizedTools.length > 0) {
      this.renderSettingsSection(container, '📦 其他工具', uncategorizedTools.map(config => ({
        key: config.key,
        title: config.title,
        icon: config.icon || '🔧',
        color: TOOL_COLORS[config.key] || '#6b7280',
        visible: this.isToolVisible(config.key),
        type: 'tool' as const,
      })));
    }

    // 自定义网站
    const allCustomSites = customSiteManager.getAll();
    CUSTOM_SITE_CATEGORIES.forEach(cat => {
      const sitesInCategory = allCustomSites.filter(site => (site.category || 'other') === cat.key);
      if (sitesInCategory.length > 0) {
        this.renderSettingsSection(container, `${cat.icon} ${cat.label}`, sitesInCategory.map(site => ({
          key: site.id,
          title: site.name,
          icon: site.icon || site.name.slice(0, 2),
          color: site.color,
          visible: this.isCustomSiteVisible(site.id),
          type: 'custom' as const,
        })));
      }
    });
  }

  private renderSettingsSection(
    container: HTMLElement,
    title: string,
    items: Array<{
      key: string;
      title: string;
      icon: string;
      color: string;
      visible: boolean;
      type: 'llm' | 'tool' | 'custom';
    }>
  ): void {
    const section = document.createElement('div');
    section.className = 'settings-section';

    const sectionTitle = document.createElement('div');
    sectionTitle.className = 'settings-section-title';
    sectionTitle.textContent = title;
    section.appendChild(sectionTitle);

    const list = document.createElement('div');
    list.className = 'settings-list';

    items.forEach(item => {
      const itemEl = document.createElement('div');
      itemEl.className = 'settings-item';
      itemEl.innerHTML = `
        <div class="settings-checkbox ${item.visible ? 'checked' : ''}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <div class="settings-item-icon" style="background:${item.color}">${item.icon}</div>
        <div class="settings-item-label">${item.title}</div>
      `;

      itemEl.addEventListener('click', () => {
        if (item.type === 'llm') {
          this.toggleLLMVisibility(item.key);
        } else if (item.type === 'custom') {
          this.toggleCustomSiteVisibility(item.key);
        } else {
          this.toggleToolVisibility(item.key);
        }
      });

      list.appendChild(itemEl);
    });

    section.appendChild(list);
    container.appendChild(section);
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
      return; // 已经是当前工具
    }

    console.log(`[App] Switching to tool: ${key}`);

    // 隐藏 LLM 容器，显示工具容器
    if (this.llmContainer) {
      this.llmContainer.style.display = 'none';
    }
    this.container.style.display = 'block';
    this.currentLLM = null;

    // 结束上一个工具的使用追踪
    if (this.currentKey) {
      UsageTracker.end();
    }

    // 失活当前工具
    if (this.currentKey && toolRegistry.has(this.currentKey)) {
      const currentTool = toolRegistry.getInstance(this.currentKey);
      currentTool?.deactivate();
    }

    // 获取工具实例
    const tool = toolRegistry.getInstance(key);
    if (!tool) {
      console.error(`[App] Failed to get tool instance: ${key}`);
      return;
    }

    // 挂载工具（如果还没挂载）
    if (!tool.mounted) {
      tool.mount(this.container);
      console.log(`[App] Tool "${key}" mounted`);
    }

    // 激活工具
    tool.activate();
    this.currentKey = key;

    // 开始新工具的使用追踪
    UsageTracker.start(key);

    // 更新边栏高亮并滚动到选中项
    this.sidebar?.setActive(key, true);

    console.log(`[App] Tool "${key}" activated`);
  }

  getToolConfigs(): ToolConfig[] {
    return toolRegistry.getAllConfigs();
  }
}

// 创建应用实例
new App();
