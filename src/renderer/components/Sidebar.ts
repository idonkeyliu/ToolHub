/**
 * 左侧边栏组件 - 分类展示 LLM 和工具
 */

export interface SidebarItem {
  key: string;
  title: string;
  shortTitle?: string;
  icon: string;
  color: string;
  category?: string;
}

export interface SidebarCategory {
  key: string;
  title: string;
  icon: string;
  items: SidebarItem[];
  collapsed?: boolean;
}

export interface SidebarOptions {
  categories: SidebarCategory[];
  onItemClick: (key: string, category: string) => void;
  onToggleCollapse?: () => void;
}

export class Sidebar {
  private container: HTMLElement;
  private options: SidebarOptions;
  private collapsed = false;
  private activeKey: string | null = null;
  private categoryStates: Map<string, boolean> = new Map();

  constructor(container: HTMLElement, options: SidebarOptions) {
    this.container = container;
    this.options = options;
    this.loadState();
    this.render();
  }

  private loadState(): void {
    try {
      const saved = localStorage.getItem('toolhub_sidebar_state');
      if (saved) {
        const state = JSON.parse(saved);
        this.collapsed = state.collapsed || false;
        if (state.categories) {
          Object.entries(state.categories).forEach(([key, collapsed]) => {
            this.categoryStates.set(key, collapsed as boolean);
          });
        }
      }
    } catch (e) {
      // ignore
    }
  }

  private saveState(): void {
    try {
      const categories: Record<string, boolean> = {};
      this.categoryStates.forEach((v, k) => categories[k] = v);
      localStorage.setItem('toolhub_sidebar_state', JSON.stringify({
        collapsed: this.collapsed,
        categories
      }));
    } catch (e) {
      // ignore
    }
  }

  private render(): void {
    this.container.innerHTML = '';
    this.container.className = `sidebar ${this.collapsed ? 'collapsed' : ''}`;

    // 折叠按钮
    const toggleBtn = document.createElement('div');
    toggleBtn.className = 'sidebar-toggle';
    toggleBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="${this.collapsed ? 'M9 18l6-6-6-6' : 'M15 18l-6-6 6-6'}"/>
      </svg>
    `;
    toggleBtn.addEventListener('click', () => this.toggleCollapse());
    this.container.appendChild(toggleBtn);

    // 分类列表
    this.options.categories.forEach(category => {
      const categoryEl = this.renderCategory(category);
      this.container.appendChild(categoryEl);
    });
  }

  private renderCategory(category: SidebarCategory): HTMLElement {
    const el = document.createElement('div');
    el.className = 'sidebar-category';
    
    const isCollapsed = this.categoryStates.get(category.key) ?? category.collapsed ?? false;

    // 分类标题
    const header = document.createElement('div');
    header.className = `sidebar-category-header ${isCollapsed ? 'collapsed' : ''}`;
    header.innerHTML = `
      <span class="sidebar-category-icon">${category.icon}</span>
      <span class="sidebar-category-title">${category.title}</span>
      <svg class="sidebar-category-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M6 9l6 6 6-6"/>
      </svg>
    `;
    header.addEventListener('click', () => {
      const newState = !this.categoryStates.get(category.key);
      this.categoryStates.set(category.key, newState);
      this.saveState();
      this.render();
      this.setActive(this.activeKey);
    });
    el.appendChild(header);

    // 分类内容
    const content = document.createElement('div');
    content.className = `sidebar-category-content ${isCollapsed ? 'collapsed' : ''}`;

    // 内部容器用于 grid 折叠动画
    const inner = document.createElement('div');
    inner.className = 'sidebar-category-inner';

    category.items.forEach(item => {
      const itemEl = document.createElement('div');
      itemEl.className = 'sidebar-item';
      itemEl.dataset.key = item.key;
      itemEl.innerHTML = `
        <span class="sidebar-item-icon" style="background:${item.color}">${item.icon}</span>
        <span class="sidebar-item-title">${this.collapsed ? '' : (item.shortTitle || item.title)}</span>
      `;
      itemEl.title = item.title;
      itemEl.addEventListener('click', () => {
        this.options.onItemClick(item.key, category.key);
      });
      inner.appendChild(itemEl);
    });

    content.appendChild(inner);
    el.appendChild(content);
    return el;
  }

  toggleCollapse(): void {
    this.collapsed = !this.collapsed;
    this.saveState();
    this.render();
    this.setActive(this.activeKey);
    this.options.onToggleCollapse?.();
  }

  setActive(key: string | null, scrollIntoView = false): void {
    this.activeKey = key;
    this.container.querySelectorAll('.sidebar-item').forEach(item => {
      const el = item as HTMLElement;
      if (el.dataset.key === key) {
        el.classList.add('active');
        // 滚动到选中项
        if (scrollIntoView) {
          el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      } else {
        el.classList.remove('active');
      }
    });
  }

  isCollapsed(): boolean {
    return this.collapsed;
  }

  updateCategories(categories: SidebarCategory[]): void {
    this.options.categories = categories;
    this.render();
    this.setActive(this.activeKey);
  }
}
