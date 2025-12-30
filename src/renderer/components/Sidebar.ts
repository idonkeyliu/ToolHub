/**
 * 左侧边栏组件 - 支持拖拽和目录管理
 */

import { categoryManager, Category, CategoryItem } from '../core/CategoryManager';
import { i18n } from '../core/i18n';

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

  public render(): void {
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

  // 渲染目录图标（支持 emoji 和图片）
  private renderCategoryIcon(category: Category): string {
    if (category.iconType === 'image') {
      return `<img src="${category.icon}" alt="" class="category-icon-img" />`;
    }
    return category.icon;
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
        <span class="sidebar-category-icon">${this.renderCategoryIcon(category)}</span>
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
      const displayTitle = i18n.getCategoryTitle(category.id, category.title);
      header.innerHTML = `
        <span class="sidebar-category-icon">${this.renderCategoryIcon(category)}</span>
        <span class="sidebar-category-title">${displayTitle}</span>
        ${!this.collapsed ? `
          <button class="category-more-btn" title="${i18n.t('common.edit')}">
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
    const displayTitle = item.type === 'tool' ? i18n.getToolTitle(item.key, item.title) : item.title;

    let html = `
      <span class="sidebar-item-icon" style="background:${item.color}">${item.icon}</span>
      <span class="sidebar-item-title">${this.collapsed ? '' : displayTitle}</span>
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
    el.title = displayTitle;

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
      // 传递完整的项目数据，支持 AI 对比功能
      const dragData = JSON.stringify({
        key: item.key,
        name: item.title,
        url: item.url || '',
        type: item.type
      });
      e.dataTransfer?.setData('text/plain', dragData);
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
    dialog.className = 'add-category-overlay';
    
    // 获取 emoji 分类
    const emojiCategories = [
      { id: 'smileys', name: '笑脸', icon: '😀', dir: '笑脸与情感' },
      { id: 'people', name: '人物', icon: '👋', dir: '人物与身体' },
      { id: 'animals', name: '动物', icon: '🐱', dir: '动物与自然' },
      { id: 'food', name: '食物', icon: '🍎', dir: '食物与饮料' },
      { id: 'travel', name: '旅行', icon: '🚗', dir: '旅行与地点' },
      { id: 'activities', name: '活动', icon: '⚽', dir: '活动' },
      { id: 'objects', name: '物品', icon: '💡', dir: '物品' },
      { id: 'symbols', name: '符号', icon: '❤️', dir: '符号' },
      { id: 'flags', name: '旗帜', icon: '🏁', dir: '旗帜' },
    ];

    const categoryTabs = emojiCategories.map((cat, idx) => 
      `<div class="add-cat-tab ${idx === 0 ? 'active' : ''}" data-category="${cat.id}" data-dir="${cat.dir}" title="${cat.name}">${cat.icon}</div>`
    ).join('');

    dialog.innerHTML = `
      <div class="add-category-dialog">
        <div class="add-cat-header">
          <div class="add-cat-title">${i18n.t('sidebar.addCategory')}</div>
          <button class="add-cat-close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
        
        <div class="add-cat-content">
          <!-- 左侧：名称输入和已选图标 -->
          <div class="add-cat-left">
            <div class="add-cat-preview">
              <div class="add-cat-preview-icon">
                <svg viewBox="0 0 24 24" fill="currentColor" class="default-folder-icon">
                  <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
                </svg>
              </div>
            </div>
            <div class="add-cat-name-field">
              <input type="text" class="add-cat-name-input" placeholder="输入目录名称" autofocus />
            </div>
          </div>
          
          <!-- 右侧：Emoji 选择器 -->
          <div class="add-cat-right">
            <div class="add-cat-search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="M21 21l-4.35-4.35"/>
              </svg>
              <input type="text" class="add-cat-search-input" placeholder="搜索图标..." />
            </div>
            <div class="add-cat-tabs">${categoryTabs}</div>
            <div class="add-cat-emoji-grid"></div>
          </div>
        </div>
        
        <div class="add-cat-footer">
          <button class="add-cat-cancel">${i18n.t('common.cancel')}</button>
          <button class="add-cat-confirm">${i18n.t('common.confirm')}</button>
        </div>
      </div>
    `;

    const previewIcon = dialog.querySelector('.add-cat-preview-icon') as HTMLElement;
    const nameInput = dialog.querySelector('.add-cat-name-input') as HTMLInputElement;
    const searchInput = dialog.querySelector('.add-cat-search-input') as HTMLInputElement;
    const emojiGrid = dialog.querySelector('.add-cat-emoji-grid') as HTMLElement;
    const cancelBtn = dialog.querySelector('.add-cat-cancel');
    const confirmBtn = dialog.querySelector('.add-cat-confirm');
    const closeBtn = dialog.querySelector('.add-cat-close');
    
    let selectedIcon = '📁';
    let selectedIconType: 'emoji' | 'image' = 'emoji';
    let currentCategory = emojiCategories[0];
    let emojiCache: Map<string, string[]> = new Map();

    // 加载并渲染 emoji
    const loadAndRenderEmojis = async (category: typeof emojiCategories[0], searchQuery?: string) => {
      if (!emojiCache.has(category.id)) {
        try {
          const files = await (window as any).llmHub.listEmojiFiles(category.dir);
          emojiCache.set(category.id, files);
        } catch (e) {
          emojiCache.set(category.id, []);
        }
      }
      
      let files = emojiCache.get(category.id) || [];
      
      // 搜索过滤
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        // 搜索所有分类
        const allResults: { file: string; dir: string }[] = [];
        for (const cat of emojiCategories) {
          if (!emojiCache.has(cat.id)) {
            try {
              const catFiles = await (window as any).llmHub.listEmojiFiles(cat.dir);
              emojiCache.set(cat.id, catFiles);
            } catch (e) {
              emojiCache.set(cat.id, []);
            }
          }
          const catFiles = emojiCache.get(cat.id) || [];
          catFiles.forEach(f => {
            const name = f.replace('.png', '').replace(/_/g, ' ');
            if (name.toLowerCase().includes(query)) {
              allResults.push({ file: f, dir: cat.dir });
            }
          });
        }
        
        emojiGrid.innerHTML = allResults.slice(0, 100).map(({ file, dir }) => {
          const path = `assets/emojis/${dir}/${file}`;
          const name = file.replace('.png', '');
          return `<div class="add-cat-emoji-item" data-path="${path}" data-name="${name}" title="${name}">
            <img src="${path}" alt="${name}" loading="lazy" />
          </div>`;
        }).join('');
        return;
      }
      
      // 渲染当前分类
      emojiGrid.innerHTML = files.map(file => {
        const path = `assets/emojis/${category.dir}/${file}`;
        const name = file.replace('.png', '');
        return `<div class="add-cat-emoji-item" data-path="${path}" data-name="${name}" title="${name}">
          <img src="${path}" alt="${name}" loading="lazy" />
        </div>`;
      }).join('');
    };

    // 初始加载
    loadAndRenderEmojis(currentCategory);

    // 分类切换
    dialog.querySelectorAll('.add-cat-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const catId = (tab as HTMLElement).dataset.category;
        const cat = emojiCategories.find(c => c.id === catId);
        if (cat) {
          currentCategory = cat;
          dialog.querySelectorAll('.add-cat-tab').forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          searchInput.value = '';
          loadAndRenderEmojis(cat);
        }
      });
    });

    // 搜索
    let searchTimeout: any;
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        const query = searchInput.value.trim();
        if (query) {
          loadAndRenderEmojis(currentCategory, query);
        } else {
          loadAndRenderEmojis(currentCategory);
        }
      }, 200);
    });

    // 选择 emoji
    emojiGrid.addEventListener('click', (e) => {
      const item = (e.target as HTMLElement).closest('.add-cat-emoji-item') as HTMLElement;
      if (item) {
        const path = item.dataset.path || '';
        const name = item.dataset.name || '';
        selectedIcon = path;
        selectedIconType = 'image';
        previewIcon.innerHTML = `<img src="${path}" alt="${name}" />`;
        
        // 更新选中状态
        emojiGrid.querySelectorAll('.add-cat-emoji-item').forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
      }
    });

    // 关闭
    const closeDialog = () => dialog.remove();
    
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) closeDialog();
    });
    closeBtn?.addEventListener('click', closeDialog);
    cancelBtn?.addEventListener('click', closeDialog);

    // 确认
    confirmBtn?.addEventListener('click', () => {
      const name = nameInput.value.trim();
      if (name) {
        categoryManager.addCategory(name, selectedIcon, selectedIconType);
        closeDialog();
      } else {
        nameInput.focus();
        nameInput.classList.add('shake');
        setTimeout(() => nameInput.classList.remove('shake'), 500);
      }
    });

    // 键盘事件
    dialog.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && document.activeElement === nameInput) {
        (confirmBtn as HTMLButtonElement)?.click();
      } else if (e.key === 'Escape') {
        closeDialog();
      }
    });

    document.body.appendChild(dialog);
    setTimeout(() => nameInput?.focus(), 100);
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
        <span>${i18n.t('common.edit')}</span>
      </div>
      <div class="context-menu-item delete-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
        <span>${i18n.t('common.delete')}</span>
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
      const displayTitle = i18n.getCategoryTitle(category.id, category.title);
      const confirmMsg = i18n.getLanguage() === 'zh' 
        ? `确定删除目录「${displayTitle}」吗？目录内的项目将被移除。`
        : `Are you sure you want to delete "${displayTitle}"? Items in this category will be removed.`;
      if (confirm(confirmMsg)) {
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
