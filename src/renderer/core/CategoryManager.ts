/**
 * 目录管理器 - 管理自定义目录和工具分配
 */

export interface CategoryItem {
  key: string;
  title: string;
  icon: string;
  color: string;
  type: 'llm' | 'tool' | 'custom-site';
  url?: string; // 用于 LLM 和自定义网站
}

export interface Category {
  id: string;
  title: string;
  icon: string;
  items: string[]; // item keys
  collapsed?: boolean;
  isSystem?: boolean; // 系统目录不可删除
}

export interface CategoryData {
  categories: Category[];
  itemMap: Record<string, CategoryItem>; // key -> item
  version: number;
}

const STORAGE_KEY = 'toolhub_category_data';
const CURRENT_VERSION = 1;

// 默认 LLM 站点
const DEFAULT_LLM_SITES: CategoryItem[] = [
  { key: 'openai', title: 'OpenAI', icon: 'OP', color: '#10a37f', type: 'llm', url: 'https://chat.openai.com' },
  { key: 'lmarena', title: 'LMArena', icon: 'LM', color: '#6366f1', type: 'llm', url: 'https://lmarena.ai/' },
  { key: 'gemini', title: 'Gemini', icon: 'GE', color: '#4285f4', type: 'llm', url: 'https://gemini.google.com' },
  { key: 'aistudio', title: 'AI Studio', icon: 'AI', color: '#ea4335', type: 'llm', url: 'https://aistudio.google.com' },
  { key: 'deepseek', title: 'DeepSeek', icon: 'DE', color: '#0066ff', type: 'llm', url: 'https://chat.deepseek.com' },
  { key: 'kimi', title: 'Kimi', icon: 'Ki', color: '#6b5ce7', type: 'llm', url: 'https://kimi.moonshot.cn' },
  { key: 'grok', title: 'Grok', icon: 'GR', color: '#1da1f2', type: 'llm', url: 'https://grok.com' },
  { key: 'claude', title: 'Claude', icon: 'CL', color: '#d97706', type: 'llm', url: 'https://claude.ai' },
  { key: 'qianwen', title: '通义千问', icon: '千', color: '#6236ff', type: 'llm', url: 'https://tongyi.aliyun.com/qianwen' },
  { key: 'doubao', title: '豆包', icon: '豆', color: '#00d4aa', type: 'llm', url: 'https://www.doubao.com/chat' },
  { key: 'yuanbao', title: '腾讯元宝', icon: '元', color: '#0052d9', type: 'llm', url: 'https://yuanbao.tencent.com/chat' },
];

// 默认开发工具站点
const DEFAULT_DEV_SITES: CategoryItem[] = [
  { key: 'vscode', title: 'VS Code', icon: 'VS', color: '#007acc', type: 'llm', url: 'https://vscode.dev' },
  { key: 'github', title: 'GitHub', icon: 'GH', color: '#24292e', type: 'llm', url: 'https://github.com' },
  { key: 'replit', title: 'Replit', icon: 'RE', color: '#f26207', type: 'llm', url: 'https://replit.com' },
  { key: 'huggingface', title: 'Hugging Face', icon: 'HF', color: '#ff9d00', type: 'llm', url: 'https://huggingface.co' },
  { key: 'projectidx', title: 'Project IDX', icon: 'IX', color: '#669df6', type: 'llm', url: 'https://idx.google.com' },
];

// 社区站点
const DEFAULT_COMMUNITY_SITES: CategoryItem[] = [
  { key: 'twitter', title: 'X', icon: '𝕏', color: '#000000', type: 'llm', url: 'https://x.com' },
  { key: 'discord', title: 'Discord', icon: 'DC', color: '#5865f2', type: 'llm', url: 'https://discord.com' },
  { key: 'hackernews', title: 'Hacker News', icon: 'HN', color: '#ff6600', type: 'llm', url: 'https://news.ycombinator.com' },
];

// 设计站点
const DEFAULT_DESIGN_SITES: CategoryItem[] = [
  { key: 'figma', title: 'Figma', icon: 'FG', color: '#f24e1e', type: 'llm', url: 'https://www.figma.com' },
  { key: 'dribbble', title: 'Dribbble', icon: 'DR', color: '#ea4c89', type: 'llm', url: 'https://dribbble.com' },
];

// 邮件站点
const DEFAULT_EMAIL_SITES: CategoryItem[] = [
  { key: 'gmail', title: 'Gmail', icon: 'GM', color: '#ea4335', type: 'llm', url: 'https://mail.google.com' },
  { key: 'outlook', title: 'Outlook', icon: 'OL', color: '#0078d4', type: 'llm', url: 'https://outlook.live.com' },
];

// 视频站点
const DEFAULT_VIDEO_SITES: CategoryItem[] = [
  { key: 'youtube', title: 'YouTube', icon: 'YT', color: '#ff0000', type: 'llm', url: 'https://www.youtube.com' },
];

// 默认工具颜色
const TOOL_COLORS: Record<string, string> = {
  time: '#f59e0b', pwd: '#ef4444', text: '#8b5cf6', calc: '#06b6d4',
  json: '#22c55e', codec: '#3b82f6', crypto: '#ec4899', dns: '#14b8a6',
  curl: '#f97316', color: '#a855f7', calendar: '#6366f1', currency: '#10b981',
  image: '#0ea5e9', database: '#f472b6', redis: '#dc2626', mongo: '#00ed64',
  diff: '#7c3aed', jwt: '#d946ef', regex: '#0891b2', terminal: '#374151', sync: '#059669',
};

// 默认分类配置
const DEFAULT_CATEGORIES: Category[] = [
  { id: 'overseas-llm', title: '海外大模型', icon: '🌍', items: ['openai', 'claude', 'gemini', 'aistudio', 'grok', 'lmarena'], isSystem: true },
  { id: 'domestic-llm', title: '国内大模型', icon: '🇨🇳', items: ['deepseek', 'kimi', 'qianwen', 'doubao', 'yuanbao'], isSystem: true },
  { id: 'dev', title: '编程开发', icon: '💻', items: ['vscode', 'github', 'replit', 'huggingface', 'projectidx'], isSystem: true },
  { id: 'community', title: 'Community', icon: '👥', items: ['twitter', 'discord', 'hackernews'], isSystem: true },
  { id: 'design', title: 'Design', icon: '🎨', items: ['figma', 'dribbble'], isSystem: true },
  { id: 'email', title: 'Email', icon: '📧', items: ['gmail', 'outlook'], isSystem: true },
  { id: 'video', title: 'Video', icon: '🎬', items: ['youtube'], isSystem: true },
  { id: 'utility', title: '实用工具', icon: '🧰', items: ['time', 'pwd', 'calc', 'color', 'calendar', 'currency', 'image'], isSystem: true },
  { id: 'encoding', title: '编解码工具', icon: '🔐', items: ['codec', 'crypto', 'jwt'], isSystem: true },
  { id: 'format', title: '格式化工具', icon: '📝', items: ['json', 'text', 'diff', 'regex'], isSystem: true },
  { id: 'storage', title: '存储工具', icon: '💾', items: ['database', 'redis', 'mongo'], isSystem: true },
  { id: 'network', title: '网络工具', icon: '🌐', items: ['dns', 'curl'], isSystem: true },
  { id: 'terminal', title: '终端工具', icon: '🖥️', items: ['terminal', 'sync'], isSystem: true },
];

class CategoryManager {
  private data: CategoryData;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.data = this.load();
  }

  private load(): CategoryData {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved) as CategoryData;
        if (data.version === CURRENT_VERSION) {
          return data;
        }
      }
    } catch (e) {
      console.warn('[CategoryManager] Failed to load data');
    }
    return this.createDefaultData();
  }

  private createDefaultData(): CategoryData {
    const itemMap: Record<string, CategoryItem> = {};
    
    // 添加 LLM 站点
    DEFAULT_LLM_SITES.forEach(site => {
      itemMap[site.key] = site;
    });

    // 添加开发工具站点
    DEFAULT_DEV_SITES.forEach(site => {
      itemMap[site.key] = site;
    });

    // 添加社区站点
    DEFAULT_COMMUNITY_SITES.forEach(site => {
      itemMap[site.key] = site;
    });

    // 添加设计站点
    DEFAULT_DESIGN_SITES.forEach(site => {
      itemMap[site.key] = site;
    });

    // 添加邮件站点
    DEFAULT_EMAIL_SITES.forEach(site => {
      itemMap[site.key] = site;
    });

    // 添加视频站点
    DEFAULT_VIDEO_SITES.forEach(site => {
      itemMap[site.key] = site;
    });

    return {
      categories: [...DEFAULT_CATEGORIES],
      itemMap,
      version: CURRENT_VERSION,
    };
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.warn('[CategoryManager] Failed to save data');
    }
    this.notify();
  }

  private notify(): void {
    this.listeners.forEach(fn => fn());
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  // 获取所有目录
  getCategories(): Category[] {
    return this.data.categories;
  }

  // 获取目录
  getCategory(id: string): Category | undefined {
    return this.data.categories.find(c => c.id === id);
  }

  // 获取项目
  getItem(key: string): CategoryItem | undefined {
    return this.data.itemMap[key];
  }

  // 获取所有项目
  getAllItems(): CategoryItem[] {
    return Object.values(this.data.itemMap);
  }

  // 注册工具（由 app.ts 调用）
  registerTool(key: string, title: string, icon: string): void {
    if (!this.data.itemMap[key]) {
      this.data.itemMap[key] = {
        key,
        title,
        icon,
        color: TOOL_COLORS[key] || '#6b7280',
        type: 'tool',
      };
      this.save();
    }
  }

  // 添加目录
  addCategory(title: string, icon: string): Category {
    const id = `custom-${Date.now()}`;
    const category: Category = {
      id,
      title,
      icon,
      items: [],
      isSystem: false,
    };
    this.data.categories.push(category);
    this.save();
    return category;
  }

  // 更新目录
  updateCategory(id: string, updates: Partial<Pick<Category, 'title' | 'icon'>>): void {
    const category = this.data.categories.find(c => c.id === id);
    if (category) {
      if (updates.title !== undefined) category.title = updates.title;
      if (updates.icon !== undefined) category.icon = updates.icon;
      this.save();
    }
  }

  // 删除目录
  deleteCategory(id: string): void {
    const category = this.data.categories.find(c => c.id === id);
    if (category) {
      // 将该目录的项目移到"未分类"或删除
      this.data.categories = this.data.categories.filter(c => c.id !== id);
      this.save();
    }
  }

  // 折叠/展开目录
  toggleCategoryCollapse(id: string): void {
    const category = this.data.categories.find(c => c.id === id);
    if (category) {
      category.collapsed = !category.collapsed;
      this.save();
    }
  }

  // 移动项目到目录
  moveItem(itemKey: string, targetCategoryId: string, targetIndex?: number): void {
    // 从所有目录中移除该项目
    this.data.categories.forEach(cat => {
      cat.items = cat.items.filter(k => k !== itemKey);
    });

    // 添加到目标目录
    const targetCategory = this.data.categories.find(c => c.id === targetCategoryId);
    if (targetCategory) {
      if (targetIndex !== undefined && targetIndex >= 0) {
        targetCategory.items.splice(targetIndex, 0, itemKey);
      } else {
        targetCategory.items.push(itemKey);
      }
    }
    this.save();
  }

  // 添加自定义网站
  addCustomSite(name: string, url: string, icon: string, color: string, categoryId: string): CategoryItem {
    const key = `site-${Date.now()}`;
    const item: CategoryItem = {
      key,
      title: name,
      icon: icon || name.slice(0, 2),
      color,
      type: 'custom-site',
      url,
    };
    this.data.itemMap[key] = item;

    // 添加到目录
    const category = this.data.categories.find(c => c.id === categoryId);
    if (category) {
      category.items.push(key);
    }
    this.save();
    return item;
  }

  // 更新自定义网站
  updateCustomSite(key: string, updates: Partial<Pick<CategoryItem, 'title' | 'icon' | 'color' | 'url'>>): void {
    const item = this.data.itemMap[key];
    if (item && item.type === 'custom-site') {
      if (updates.title !== undefined) item.title = updates.title;
      if (updates.icon !== undefined) item.icon = updates.icon;
      if (updates.color !== undefined) item.color = updates.color;
      if (updates.url !== undefined) item.url = updates.url;
      this.save();
    }
  }

  // 删除自定义网站
  deleteCustomSite(key: string): void {
    const item = this.data.itemMap[key];
    if (item && item.type === 'custom-site') {
      // 从所有目录中移除
      this.data.categories.forEach(cat => {
        cat.items = cat.items.filter(k => k !== key);
      });
      delete this.data.itemMap[key];
      this.save();
    }
  }

  // 重排目录顺序
  reorderCategories(categoryIds: string[]): void {
    const categoryMap = new Map(this.data.categories.map(c => [c.id, c]));
    this.data.categories = categoryIds
      .map(id => categoryMap.get(id))
      .filter((c): c is Category => c !== undefined);
    this.save();
  }

  // 重排目录内项目顺序
  reorderItems(categoryId: string, itemKeys: string[]): void {
    const category = this.data.categories.find(c => c.id === categoryId);
    if (category) {
      category.items = itemKeys;
      this.save();
    }
  }

  // 重置为默认
  reset(): void {
    this.data = this.createDefaultData();
    this.save();
  }
}

export const categoryManager = new CategoryManager();
