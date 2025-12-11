/**
 * Command Palette 组件 - Cmd+K 快速搜索切换
 */

export interface CommandItem {
  key: string;
  title: string;
  icon: string;
  color: string;
  category: string;
  keywords?: string[];
}

export interface CommandPaletteOptions {
  items: CommandItem[];
  onSelect: (key: string) => void;
  placeholder?: string;
}

export class CommandPalette {
  private overlay!: HTMLElement;
  private panel!: HTMLElement;
  private input!: HTMLInputElement;
  private list!: HTMLElement;
  private options: CommandPaletteOptions;
  private filteredItems: CommandItem[] = [];
  private selectedIndex = 0;
  private isOpen = false;

  constructor(options: CommandPaletteOptions) {
    this.options = options;
    this.filteredItems = [...options.items];
    this.createElements();
    this.setupKeyboardShortcut();
  }

  private createElements(): void {
    // 遮罩层
    this.overlay = document.createElement('div');
    this.overlay.className = 'command-palette-overlay';
    this.overlay.addEventListener('click', (e) => {
      // 只有点击遮罩层本身才关闭，点击面板内部不关闭
      if (e.target === this.overlay) {
        this.close();
      }
    });

    // 面板
    this.panel = document.createElement('div');
    this.panel.className = 'command-palette';
    // 阻止面板内的点击事件冒泡到遮罩层
    this.panel.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    // 搜索框
    const searchWrapper = document.createElement('div');
    searchWrapper.className = 'command-palette-search';
    searchWrapper.innerHTML = `
      <svg class="command-palette-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"/>
        <path d="M21 21l-4.35-4.35"/>
      </svg>
    `;

    this.input = document.createElement('input');
    this.input.type = 'text';
    this.input.className = 'command-palette-input';
    this.input.placeholder = this.options.placeholder || '搜索工具或 LLM...';
    this.input.addEventListener('input', () => this.handleInput());
    this.input.addEventListener('keydown', (e) => this.handleKeydown(e));
    searchWrapper.appendChild(this.input);

    // 快捷键提示
    const hint = document.createElement('span');
    hint.className = 'command-palette-hint';
    hint.textContent = 'ESC 关闭';
    searchWrapper.appendChild(hint);

    this.panel.appendChild(searchWrapper);

    // 列表
    this.list = document.createElement('div');
    this.list.className = 'command-palette-list';
    
    // 使用事件委托处理点击和 hover
    this.list.addEventListener('click', (e) => {
      const target = (e.target as HTMLElement).closest('.command-palette-item') as HTMLElement;
      if (target && target.dataset.key) {
        const item = this.filteredItems.find(i => i.key === target.dataset.key);
        if (item) {
          this.selectItem(item);
        }
      }
    });
    
    this.list.addEventListener('mouseover', (e) => {
      const target = (e.target as HTMLElement).closest('.command-palette-item') as HTMLElement;
      if (target && target.dataset.index) {
        const newIndex = parseInt(target.dataset.index, 10);
        if (newIndex !== this.selectedIndex) {
          this.selectedIndex = newIndex;
          this.updateSelection();
        }
      }
    });
    
    this.panel.appendChild(this.list);

    this.overlay.appendChild(this.panel);
    document.body.appendChild(this.overlay);
  }

  private setupKeyboardShortcut(): void {
    document.addEventListener('keydown', (e) => {
      // Cmd/Ctrl + K 打开
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        this.toggle();
        return;
      }

      // ESC 关闭（全局监听）
      if (e.key === 'Escape' && this.isOpen) {
        e.preventDefault();
        e.stopPropagation();
        this.close();
      }
    });
  }

  private handleInput(): void {
    const query = this.input.value.toLowerCase().trim();
    
    if (!query) {
      this.filteredItems = [...this.options.items];
    } else {
      this.filteredItems = this.options.items.filter(item => {
        const titleMatch = item.title.toLowerCase().includes(query);
        const keyMatch = item.key.toLowerCase().includes(query);
        const categoryMatch = item.category.toLowerCase().includes(query);
        const keywordsMatch = item.keywords?.some(kw => kw.toLowerCase().includes(query));
        return titleMatch || keyMatch || categoryMatch || keywordsMatch;
      });
    }

    this.selectedIndex = 0;
    this.renderList();
  }

  private handleKeydown(e: KeyboardEvent): void {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.selectedIndex = Math.min(this.selectedIndex + 1, this.filteredItems.length - 1);
        this.updateSelection();
        this.scrollToSelected();
        break;
      case 'ArrowUp':
        e.preventDefault();
        this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
        this.updateSelection();
        this.scrollToSelected();
        break;
      case 'Enter':
        e.preventDefault();
        if (this.filteredItems[this.selectedIndex]) {
          this.selectItem(this.filteredItems[this.selectedIndex]);
        }
        break;
      // ESC 已在全局处理
    }
  }

  private scrollToSelected(): void {
    const selected = this.list.querySelector('.command-palette-item.selected');
    if (selected) {
      selected.scrollIntoView({ block: 'nearest' });
    }
  }

  private updateSelection(): void {
    // 只更新选中状态，不重新渲染
    this.list.querySelectorAll('.command-palette-item').forEach((el) => {
      const item = el as HTMLElement;
      if (item.dataset.index === String(this.selectedIndex)) {
        item.classList.add('selected');
      } else {
        item.classList.remove('selected');
      }
    });
  }

  private renderList(): void {
    this.list.innerHTML = '';

    if (this.filteredItems.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'command-palette-empty';
      empty.textContent = '没有找到匹配的结果';
      this.list.appendChild(empty);
      return;
    }

    // 按分类分组
    const grouped = new Map<string, CommandItem[]>();
    this.filteredItems.forEach(item => {
      const items = grouped.get(item.category) || [];
      items.push(item);
      grouped.set(item.category, items);
    });

    let globalIndex = 0;
    grouped.forEach((items, category) => {
      // 分类容器
      const groupEl = document.createElement('div');
      groupEl.className = 'command-palette-group';

      // 分类标题
      const categoryEl = document.createElement('div');
      categoryEl.className = 'command-palette-category';
      categoryEl.textContent = category;
      groupEl.appendChild(categoryEl);

      // 项目网格容器
      const itemsGrid = document.createElement('div');
      itemsGrid.className = 'command-palette-items';

      // 分类项目
      items.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = `command-palette-item ${globalIndex === this.selectedIndex ? 'selected' : ''}`;
        itemEl.dataset.index = String(globalIndex);
        itemEl.dataset.key = item.key;
        itemEl.innerHTML = `
          <span class="command-palette-item-icon" style="background:${item.color}">${item.icon}</span>
          <span class="command-palette-item-title">${item.title}</span>
        `;
        
        itemsGrid.appendChild(itemEl);
        globalIndex++;
      });

      groupEl.appendChild(itemsGrid);
      this.list.appendChild(groupEl);
    });
  }

  private selectItem(item: CommandItem): void {
    this.close();
    this.options.onSelect(item.key);
  }

  open(): void {
    if (this.isOpen) return;
    this.isOpen = true;
    this.overlay.classList.add('show');
    this.input.value = '';
    this.filteredItems = [...this.options.items];
    this.selectedIndex = 0;
    this.renderList();
    setTimeout(() => this.input.focus(), 50);
  }

  close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.overlay.classList.remove('show');
  }

  toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  updateItems(items: CommandItem[]): void {
    this.options.items = items;
    this.filteredItems = [...items];
    if (this.isOpen) {
      this.handleInput();
    }
  }
}
