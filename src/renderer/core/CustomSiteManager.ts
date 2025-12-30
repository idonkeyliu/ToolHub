/**
 * 自定义网站管理器
 * 用于管理用户添加的自定义网站
 */

export interface CustomSite {
  id: string;
  name: string;
  url: string;
  icon?: string;
  color: string;
  category?: string;  // 分类：ai, tool, other
  createdAt: number;
}

/** 自定义网站分类 */
export const CUSTOM_SITE_CATEGORIES = [
  { key: 'ai', label: 'AI 工具', icon: '🤖' },
  { key: 'dev', label: '开发工具', icon: '💻' },
  { key: 'design', label: '设计资源', icon: '🎨' },
  { key: 'doc', label: '文档知识', icon: '📚' },
  { key: 'media', label: '影音娱乐', icon: '🎬' },
  { key: 'social', label: '社交通讯', icon: '💬' },
  { key: 'tool', label: '效率工具', icon: '🛠️' },
  { key: 'other', label: '其他网站', icon: '🌐' },
];

const STORAGE_KEY = 'toolhub_custom_sites';

class CustomSiteManager {
  private sites: CustomSite[] = [];
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        this.sites = JSON.parse(saved);
      }
    } catch (e) {
      console.warn('[CustomSiteManager] Failed to load custom sites');
      this.sites = [];
    }
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.sites));
      this.notifyListeners();
    } catch (e) {
      console.warn('[CustomSiteManager] Failed to save custom sites');
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  /** 订阅变化 */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** 获取所有自定义网站 */
  getAll(): CustomSite[] {
    return [...this.sites];
  }

  /** 根据 ID 获取网站 */
  get(id: string): CustomSite | undefined {
    return this.sites.find(site => site.id === id);
  }

  /** 添加自定义网站 */
  add(site: Omit<CustomSite, 'id' | 'createdAt'>): CustomSite {
    const newSite: CustomSite = {
      ...site,
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
    };
    this.sites.push(newSite);
    this.save();
    return newSite;
  }

  /** 更新自定义网站 */
  update(id: string, updates: Partial<Omit<CustomSite, 'id' | 'createdAt'>>): boolean {
    const index = this.sites.findIndex(site => site.id === id);
    if (index === -1) return false;
    
    this.sites[index] = { ...this.sites[index], ...updates };
    this.save();
    return true;
  }

  /** 删除自定义网站 */
  delete(id: string): boolean {
    const index = this.sites.findIndex(site => site.id === id);
    if (index === -1) return false;
    
    this.sites.splice(index, 1);
    this.save();
    return true;
  }

  /** 生成唯一的 key（用于 webview partition） */
  getPartitionKey(id: string): string {
    return `persist:custom_${id}`;
  }
}

export const customSiteManager = new CustomSiteManager();
