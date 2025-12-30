/**
 * 左侧边栏组件 - 支持拖拽和目录管理
 */

import { categoryManager, Category, CategoryItem } from '../core/CategoryManager';

export interface SidebarOptions {
  onItemClick: (key: string, type: 'llm' | 'tool' | 'custom-site') => void;
  onItemEdit?: (key: string) => void;
  onAddItem?: (categoryId: string) => void;
}

export class Sidebar {
  private container: HTMLElement;
  private options: SidebarOptions;
  private collapsed = false;
  private activeKey: string | null = null;
  private draggedItem: string | null = null;
  private dragSourceCategory: string | null = null;
  private draggedCategory: string | null = null;
  private editingCategoryId: string | null = null;

  constructor(container: HTMLElement, options: SidebarOptions) {
    this.container = container;
    this.options = options;
    this.loadState();
    this.render();

    // 订阅数据变化
    categoryManager.subscribe(() => {
      this.render();
      this.setActive(this.activeKey);
    });
  }

  private loadState(): void {
    // 默认展开侧边栏，不再从 localStorage 加载折叠状态
    this.collapsed = false;
  }

  private saveState(): void {
    try {
      localStorage.setItem('toolhub_sidebar_collapsed', JSON.stringify(this.collapsed));
    } catch (e) {
      // ignore
    }
  }

  private render(): void {
    this.container.innerHTML = '';
    this.container.className = `sidebar ${this.collapsed ? 'collapsed' : ''}`;

    // 分类列表容器
    const categoriesContainer = document.createElement('div');
    categoriesContainer.className = 'sidebar-categories';

    // 渲染所有目录
    const categories = categoryManager.getCategories();
    categories.forEach(category => {
      const categoryEl = this.renderCategory(category);
      categoriesContainer.appendChild(categoryEl);
    });

    this.container.appendChild(categoriesContainer);
  }

  private renderCategory(category: Category): HTMLElement {
    const el = document.createElement('div');
    el.className = 'sidebar-category';
    el.dataset.categoryId = category.id;

    // 分类标题
    const header = document.createElement('div');
    header.className = `sidebar-category-header ${category.collapsed ? 'collapsed' : ''}`;
    header.draggable = !category.isSystem;

    if (this.editingCategoryId === category.id) {
      // 编辑模式
      header.innerHTML = `
        <span class="sidebar-category-icon">${category.icon}</span>
        <input type="text" class="category-edit-input" value="${category.title}" />
        <button class="category-edit-save">✓</button>
        <button class="category-edit-cancel">✕</button>
      `;
      
      const input = header.querySelector('.category-edit-input') as HTMLInputElement;
      const saveBtn = header.querySelector('.category-edit-save');
      const cancelBtn = header.querySelector('.category-edit-cancel');

      setTimeout(() => input?.focus(), 0);

      input?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          categoryManager.updateCategory(category.id, { title: input.value });
          this.editingCategoryId = null;
          this.render();
        } else if (e.key === 'Escape') {
          this.editingCategoryId = null;
          this.render();
        }
      });

      saveBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        categoryManager.updateCategory(category.id, { title: input.value });
        this.editingCategoryId = null;
        this.render();
      });

      cancelBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.editingCategoryId = null;
        this.render();
      });
    } else {
      // 正常模式 - 移除 + 和 > 按钮，添加 ... 菜单
      header.innerHTML = `
        <span class="sidebar-category-icon">${category.icon}</span>
        <span class="sidebar-category-title">${category.title}</span>
        ${!this.collapsed ? `
          <button class="category-more-btn" title="更多操作">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="2"></circle>
              <circle cx="12" cy="12" r="2"></circle>
              <circle cx="12" cy="19" r="2"></circle>
            </svg>
          </button>
        ` : ''}
      `;

      // 点击展开/折叠
      header.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('.category-more-btn')) return;
        categoryManager.toggleCategoryCollapse(category.id);
      });

      // ... 更多操作按钮
      const moreBtn = header.querySelector('.category-more-btn');
      moreBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.showCategoryMenu(category, e as MouseEvent);
      });

      // 目录拖拽
      if (!category.isSystem) {
        header.addEventListener('dragstart', (e) => {
          this.draggedCategory = category.id;
          el.classList.add('dragging');
          e.dataTransfer?.setData('text/plain', category.id);
        });

        header.addEventListener('dragend', () => {
          this.draggedCategory = null;
          el.classList.remove('dragging');
        });
      }
    }

    el.appendChild(header);

    // 分类内容
    const content = document.createElement('div');
    content.className = `sidebar-category-content ${category.collapsed ? 'collapsed' : ''}`;

    const inner = document.createElement('div');
    inner.className = 'sidebar-category-inner';

    // 拖放区域 - 只处理拖到空白区域的情况
    inner.addEventListener('dragover', (e) => {
      e.preventDefault();
      // 只有拖到空白区域时才显示 drag-over
      if (this.draggedItem && e.target === inner) {
        inner.classList.add('drag-over');
      }
    });

    inner.addEventListener('dragleave', (e) => {
      // 只有真正离开 inner 时才移除样式
      const relatedTarget = e.relatedTarget as HTMLElement;
      if (!inner.contains(relatedTarget)) {
        inner.classList.remove('drag-over');
      }
    });

    inner.addEventListener('drop', (e) => {
      e.preventDefault();
      inner.classList.remove('drag-over');
      
      // 只处理拖到空白区域的情况（不是拖到具体项目上）
      const target = e.target as HTMLElement;
      if (target !== inner && target.closest('.sidebar-item')) {
        return; // 让项目的 drop 处理
      }
      
      const draggedKey = this.draggedItem;
      if (!draggedKey) return;
      
      // 如果是同目录，不处理（没有意义）
      if (this.dragSourceCategory === category.id) return;
      
      // 移动到目录末尾
      categoryManager.moveItem(draggedKey, category.id);
      
      this.draggedItem = null;
      this.dragSourceCategory = null;
    });

    // 渲染项目
    category.items.forEach(itemKey => {
      const item = categoryManager.getItem(itemKey);
      if (item) {
        const itemEl = this.renderItem(item, category.id);
        inner.appendChild(itemEl);
      }
    });

    content.appendChild(inner);
    el.appendChild(content);

    return el;
  }

  private renderItem(item: CategoryItem, categoryId: string): HTMLElement {
    const el = document.createElement('div');
    el.className = 'sidebar-item';
    el.dataset.key = item.key;
    el.dataset.categoryId = categoryId;
    el.draggable = true;

    const isLink = item.type === 'llm' || item.type === 'custom-site';

    let html = `
      <span class="sidebar-item-icon" style="background:${item.color}">${item.icon}</span>
      <span class="sidebar-item-title">${this.collapsed ? '' : item.title}</span>
    `;

    // 链接类型显示外部链接按钮
    if (isLink && !this.collapsed) {
      html += `
        <button class="item-external-btn" title="在浏览器中打开">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/>
            <line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
        </button>
      `;
    }

    // 自定义网站显示编辑按钮
    if (item.type === 'custom-site' && !this.collapsed) {
      html += `
        <button class="item-edit-btn" title="编辑">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
      `;
    }

    el.innerHTML = html;
    el.title = item.title;

    // 点击项目
    el.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('.item-edit-btn')) return;
      if ((e.target as HTMLElement).closest('.item-external-btn')) return;
      this.options.onItemClick(item.key, item.type);
    });

    // 外部链接按钮 - 在系统浏览器中打开
    if (isLink && item.url) {
      const externalBtn = el.querySelector('.item-external-btn');
      externalBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        (window as any).llmHub?.openExternal?.(item.url);
      });
    }

    // 编辑按钮
    if (item.type === 'custom-site') {
      const editBtn = el.querySelector('.item-edit-btn');
      editBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.options.onItemEdit?.(item.key);
      });
    }

    // 拖拽开始
    el.addEventListener('dragstart', (e) => {
      this.draggedItem = item.key;
      this.dragSourceCategory = categoryId;
      el.classList.add('dragging');
      e.dataTransfer?.setData('text/plain', item.key);
      e.dataTransfer!.effectAllowed = 'move';
    });

    // 拖拽结束 - 清理所有状态
    el.addEventListener('dragend', () => {
      this.draggedItem = null;
      this.dragSourceCategory = null;
      el.classList.remove('dragging');
      // 清理所有拖拽样式
      document.querySelectorAll('.drag-over, .drag-before, .drag-after').forEach(el => {
        el.classList.remove('drag-over', 'drag-before', 'drag-after');
      });
    });

    // 项目间拖放排序
    el.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (this.draggedItem && this.draggedItem !== item.key) {
        const rect = el.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        if (e.clientY < midY) {
          el.classList.add('drag-before');
          el.classList.remove('drag-after');
        } else {
          el.classList.add('drag-after');
          el.classList.remove('drag-before');
        }
      }
    });

    el.addEventListener('dragleave', (e) => {
      // 只有真正离开元素时才移除样式
      const relatedTarget = e.relatedTarget as HTMLElement;
      if (!el.contains(relatedTarget)) {
        el.classList.remove('drag-before', 'drag-after');
      }
    });

    el.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const draggedKey = this.draggedItem;
      const sourceCategory = this.dragSourceCategory;
      
      el.classList.remove('drag-before', 'drag-after');
      
      if (!draggedKey || draggedKey === item.key) return;
      
      // 获取目标位置
      const rect = el.getBoundingClientRect();
      const insertAfter = e.clientY > rect.top + rect.height / 2;
      
      // 判断是同目录排序还是跨目录移动
      if (sourceCategory === categoryId) {
        // 同目录内排序
        const category = categoryManager.getCategory(categoryId);
        if (category) {
          const items = [...category.items];
          const draggedIndex = items.indexOf(draggedKey);
          let targetIndex = items.indexOf(item.key);
          
          if (draggedIndex === -1) return;
          
          // 移除原位置
          items.splice(draggedIndex, 1);
          // 调整目标索引
          if (draggedIndex < targetIndex) targetIndex--;
          // 插入新位置
          if (insertAfter) targetIndex++;
          items.splice(targetIndex, 0, draggedKey);
          
          categoryManager.reorderItems(categoryId, items);
        }
      } else {
        // 跨目录移动
        const targetCategory = categoryManager.getCategory(categoryId);
        if (targetCategory) {
          let targetIndex = targetCategory.items.indexOf(item.key);
          if (insertAfter) targetIndex++;
          categoryManager.moveItem(draggedKey, categoryId, targetIndex);
        }
      }
      
      // 清理状态
      this.draggedItem = null;
      this.dragSourceCategory = null;
    });

    return el;
  }

  public showAddCategoryDialog(): void {
    const dialog = document.createElement('div');
    dialog.className = 'category-dialog-overlay';
    dialog.innerHTML = `
      <div class="category-dialog">
        <div class="category-dialog-header">添加目录</div>
        <div class="category-dialog-body">
          <div class="category-dialog-field">
            <label>图标</label>
            <input type="text" class="category-icon-input" value="📁" maxlength="2" />
          </div>
          <div class="category-dialog-field">
            <label>名称</label>
            <input type="text" class="category-name-input" placeholder="输入目录名称" />
          </div>
        </div>
        <div class="category-dialog-footer">
          <button class="category-dialog-cancel">取消</button>
          <button class="category-dialog-confirm">确定</button>
        </div>
      </div>
    `;

    const iconInput = dialog.querySelector('.category-icon-input') as HTMLInputElement;
    const nameInput = dialog.querySelector('.category-name-input') as HTMLInputElement;
    const cancelBtn = dialog.querySelector('.category-dialog-cancel');
    const confirmBtn = dialog.querySelector('.category-dialog-confirm');

    cancelBtn?.addEventListener('click', () => dialog.remove());
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) dialog.remove();
    });

    confirmBtn?.addEventListener('click', () => {
      const name = nameInput.value.trim();
      const icon = iconInput.value.trim() || '📁';
      if (name) {
        categoryManager.addCategory(name, icon);
        dialog.remove();
      }
    });

    nameInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        (confirmBtn as HTMLButtonElement)?.click();
      } else if (e.key === 'Escape') {
        dialog.remove();
      }
    });

    document.body.appendChild(dialog);
    setTimeout(() => nameInput?.focus(), 0);
  }

  private showCategoryMenu(category: Category, event: MouseEvent): void {
    // 移除已有的菜单
    document.querySelectorAll('.category-context-menu').forEach(m => m.remove());

    const menu = document.createElement('div');
    menu.className = 'category-context-menu';
    menu.innerHTML = `
      <div class="context-menu-item rename-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
        <span>重命名</span>
      </div>
      <div class="context-menu-item delete-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
        <span>删除</span>
      </div>
    `;

    // 定位菜单
    const btnRect = (event.target as HTMLElement).closest('.category-more-btn')?.getBoundingClientRect();
    if (btnRect) {
      menu.style.top = `${btnRect.bottom + 4}px`;
      menu.style.left = `${btnRect.left}px`;
    }

    // 重命名
    menu.querySelector('.rename-item')?.addEventListener('click', () => {
      menu.remove();
      this.editingCategoryId = category.id;
      this.render();
    });

    // 删除
    menu.querySelector('.delete-item')?.addEventListener('click', () => {
      menu.remove();
      if (confirm(`确定删除目录「${category.title}」吗？目录内的项目将被移除。`)) {
        categoryManager.deleteCategory(category.id);
      }
    });

    // 点击其他地方关闭
    const closeMenu = (e: MouseEvent) => {
      if (!menu.contains(e.target as Node)) {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      }
    };
    setTimeout(() => document.addEventListener('click', closeMenu), 0);

    document.body.appendChild(menu);
  }

  toggleCollapse(): void {
    this.collapsed = !this.collapsed;
    this.saveState();
    this.render();
    this.setActive(this.activeKey);
  }

  setActive(key: string | null, scrollIntoView = false): void {
    this.activeKey = key;
    this.container.querySelectorAll('.sidebar-item').forEach(item => {
      const el = item as HTMLElement;
      if (el.dataset.key === key) {
        el.classList.add('active');
        if (scrollIntoView) {
          el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      } else {
        el.classList.remove('active');
      }
    });
  }

  clearSelection(): void {
    this.activeKey = null;
    const items = this.container.querySelectorAll('.sidebar-item');
    items.forEach(el => el.classList.remove('active'));
  }

  isCollapsed(): boolean {
    return this.collapsed;
  }
}

// 导出兼容旧接口
export interface SidebarItem {
  key: string;
  title: string;
  shortTitle?: string;
  icon: string;
  color: string;
  category?: string;
  isCustom?: boolean;
}

export interface SidebarCategory {
  key: string;
  title: string;
  icon: string;
  items: SidebarItem[];
  collapsed?: boolean;
  showAddButton?: boolean;
}
