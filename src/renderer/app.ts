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
}

class App {
  private currentKey: string | null = null;
  private currentLLM: string | null = null;
  private container: HTMLElement | null = null;
  private navList: HTMLElement | null = null;
  private llmNavList: HTMLElement | null = null;
  private llmContainer: HTMLElement | null = null;
  private webviews: Map<string, HTMLElement> = new Map();
  private navVisibility: NavVisibility = { llm: {}, tools: {} };

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
    this.navList = document.getElementById('navList');
    this.llmNavList = document.getElementById('llmNavList');
    this.llmContainer = document.getElementById('llmContainer');

    if (!this.container || !this.navList) {
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

    // 6. 渲染导航栏
    this.renderNav();
    this.renderLLMNav();

    // 7. 监听事件
    this.setupEventListeners();

    // 8. 设置快捷键
    this.setupKeyboardShortcuts();

    // 9. 设置设置面板
    this.setupSettings();

    // 10. 隐藏加载状态
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'none';

    // 11. 切换到第一个可见的工具
    const firstTool = toolRegistry.getAllConfigs().find(t => this.isToolVisible(t.key));
    if (firstTool) {
      this.switchTool(firstTool.key);
    }

    console.log('[App] Initialization complete');
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
    this.renderLLMNav();
    this.renderSettingsLLMList();
  }

  private toggleToolVisibility(key: string): void {
    this.navVisibility.tools[key] = !this.isToolVisible(key);
    this.saveNavVisibility();
    this.renderNav();
    this.renderSettingsToolList();
  }

  private renderLLMNav(): void {
    if (!this.llmNavList) return;

    this.llmNavList.innerHTML = '';

    LLM_SITES.forEach((site) => {
      if (!this.isLLMVisible(site.key)) return;

      const item = document.createElement('div');
      item.className = 'nav-item llm-nav-item';
      item.dataset.key = site.key;
      item.innerHTML = `<span class="nav-icon" style="background:${site.color}">${site.icon}</span>${site.shortTitle}`;
      
      item.addEventListener('click', () => {
        this.switchLLM(site.key);
      });

      this.llmNavList!.appendChild(item);
    });
  }

  private switchLLM(key: string): void {
    if (!this.llmContainer || !this.container) return;

    // 失活当前工具
    if (this.currentKey) {
      const currentTool = toolRegistry.getInstance(this.currentKey);
      currentTool?.deactivate();
      this.currentKey = null;
      this.updateNavActive('');
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
    this.updateLLMNavActive(key);
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

  private updateLLMNavActive(key: string): void {
    if (!this.llmNavList) return;

    this.llmNavList.querySelectorAll('.nav-item').forEach((item) => {
      const el = item as HTMLElement;
      if (el.dataset.key === key) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });
  }

  private renderNav(): void {
    if (!this.navList) return;

    const configs = toolRegistry.getAllConfigs();
    this.navList.innerHTML = '';

    configs.forEach((config) => {
      // 初始化工具可见性默认值
      if (this.navVisibility.tools[config.key] === undefined) {
        this.navVisibility.tools[config.key] = true;
      }

      if (!this.isToolVisible(config.key)) return;

      const item = document.createElement('div');
      item.className = 'nav-item tool-nav-item';
      item.dataset.key = config.key;
      const color = TOOL_COLORS[config.key] || '#6b7280';
      item.innerHTML = `<span class="nav-icon" style="background:${color}">${config.icon || ''}</span>${config.title}`;
      
      item.addEventListener('click', () => {
        this.switchTool(config.key);
      });

      this.navList!.appendChild(item);
    });
  }

  private updateNavActive(key: string): void {
    if (!this.navList) return;

    this.navList.querySelectorAll('.nav-item').forEach((item) => {
      const el = item as HTMLElement;
      if (el.dataset.key === key) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
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
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const settingsClose = document.getElementById('settingsClose');

    if (!settingsBtn || !settingsModal || !settingsClose) return;

    // 打开设置
    settingsBtn.addEventListener('click', () => {
      this.renderSettingsLLMList();
      this.renderSettingsToolList();
      settingsModal.classList.add('show');
    });

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

  private renderSettingsLLMList(): void {
    const container = document.getElementById('llmSettingsList');
    if (!container) return;

    container.innerHTML = '';

    LLM_SITES.forEach((site) => {
      const isVisible = this.isLLMVisible(site.key);
      const item = document.createElement('div');
      item.className = 'settings-item';
      item.innerHTML = `
        <div class="settings-checkbox ${isVisible ? 'checked' : ''}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <div class="settings-item-icon" style="background:${site.color}">${site.icon}</div>
        <div class="settings-item-label">${site.title}</div>
      `;

      item.addEventListener('click', () => {
        this.toggleLLMVisibility(site.key);
      });

      container.appendChild(item);
    });
  }

  private renderSettingsToolList(): void {
    const container = document.getElementById('toolSettingsList');
    if (!container) return;

    container.innerHTML = '';

    const configs = toolRegistry.getAllConfigs();
    configs.forEach((config) => {
      const isVisible = this.isToolVisible(config.key);
      const color = TOOL_COLORS[config.key] || '#6b7280';
      const item = document.createElement('div');
      item.className = 'settings-item';
      item.innerHTML = `
        <div class="settings-checkbox ${isVisible ? 'checked' : ''}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <div class="settings-item-icon" style="background:${color}">${config.icon || ''}</div>
        <div class="settings-item-label">${config.title}</div>
      `;

      item.addEventListener('click', () => {
        this.toggleToolVisibility(config.key);
      });

      container.appendChild(item);
    });
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
    this.updateLLMNavActive('');

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

    // 更新导航栏高亮
    this.updateNavActive(key);

    console.log(`[App] Tool "${key}" activated`);
  }

  getToolConfigs(): ToolConfig[] {
    return toolRegistry.getAllConfigs();
  }
}

// 创建应用实例
new App();
