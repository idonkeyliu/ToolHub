/**
 * 添加/编辑项目对话框模块
 */

import { i18n } from '../core/i18n';
import { categoryManager, CategoryItem } from '../core/CategoryManager';
import { toast } from '../components/Toast';

export interface AddItemDialogCallbacks {
  onItemAdded?: (item: CategoryItem) => void;
  onItemDeleted?: (key: string) => void;
  onWebviewRemove?: (key: string) => void;
  switchToItem?: (key: string) => void;
}

export class AddItemDialog {
  private dialog: HTMLElement | null = null;
  private targetCategory: string | null = null;
  private callbacks: AddItemDialogCallbacks;

  constructor(callbacks: AddItemDialogCallbacks = {}) {
    this.callbacks = callbacks;
    this.init();
  }

  private init(): void {
    this.dialog = document.createElement('div');
    this.dialog.className = 'add-site-overlay';
    this.dialog.style.display = 'none';
    this.dialog.innerHTML = `
      <div class="add-site-dialog">
        <div class="add-site-header">
          <div class="add-site-title">${i18n.t('app.addSite')}</div>
          <button class="add-site-close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div class="add-site-body">
          <div class="add-site-preview">
            <div class="add-site-preview-icon" style="background: #3b82f6"></div>
          </div>
          <div class="add-site-field">
            <label>${i18n.t('app.siteName')}</label>
            <input type="text" class="add-site-name-input" placeholder="${i18n.t('app.siteNamePlaceholder')}" />
          </div>
          <div class="add-site-field">
            <label>${i18n.t('app.siteUrl')}</label>
            <input type="text" class="add-site-url-input" placeholder="https://github.com" />
          </div>
          <div class="add-site-field">
            <label>${i18n.t('app.category')}</label>
            <select class="add-site-category-select"></select>
          </div>
          <div class="add-site-field">
            <label>${i18n.t('app.iconColor')}</label>
            <div class="add-site-color-row">
              <div class="add-site-color-presets">
                <div class="color-preset active" data-color="#3b82f6" style="background: #3b82f6"></div>
                <div class="color-preset" data-color="#10b981" style="background: #10b981"></div>
                <div class="color-preset" data-color="#22c55e" style="background: #22c55e"></div>
                <div class="color-preset" data-color="#f59e0b" style="background: #f59e0b"></div>
                <div class="color-preset" data-color="#f97316" style="background: #f97316"></div>
                <div class="color-preset" data-color="#ef4444" style="background: #ef4444"></div>
                <div class="color-preset" data-color="#dc2626" style="background: #dc2626"></div>
                <div class="color-preset" data-color="#8b5cf6" style="background: #8b5cf6"></div>
                <div class="color-preset" data-color="#7c3aed" style="background: #7c3aed"></div>
                <div class="color-preset" data-color="#ec4899" style="background: #ec4899"></div>
                <div class="color-preset" data-color="#d946ef" style="background: #d946ef"></div>
                <div class="color-preset" data-color="#06b6d4" style="background: #06b6d4"></div>
                <div class="color-preset" data-color="#0ea5e9" style="background: #0ea5e9"></div>
                <div class="color-preset" data-color="#14b8a6" style="background: #14b8a6"></div>
                <div class="color-preset" data-color="#6b7280" style="background: #6b7280"></div>
                <div class="color-preset" data-color="#374151" style="background: #374151"></div>
              </div>
              <input type="color" class="add-site-color-input" value="#3b82f6" />
            </div>
          </div>
        </div>
        <div class="add-site-footer">
          <button class="add-site-cancel">${i18n.t('common.cancel')}</button>
          <button class="add-site-confirm">${i18n.t('common.confirm')}</button>
        </div>
      </div>
    `;

    this.setupEventListeners();
    document.body.appendChild(this.dialog);
  }

  private setupEventListeners(): void {
    if (!this.dialog) return;

    // 取消按钮
    this.dialog.querySelector('.add-site-cancel')?.addEventListener('click', () => {
      this.hide();
    });

    // 关闭按钮
    this.dialog.querySelector('.add-site-close')?.addEventListener('click', () => {
      this.hide();
    });

    // 点击遮罩关闭
    this.dialog.addEventListener('click', (e) => {
      if (e.target === this.dialog) {
        this.hide();
      }
    });

    // 确定按钮
    this.dialog.querySelector('.add-site-confirm')?.addEventListener('click', () => {
      this.confirm();
    });

    // 回车提交
    this.dialog.querySelectorAll('input[type="text"]').forEach(input => {
      input.addEventListener('keydown', (e: Event) => {
        const ke = e as KeyboardEvent;
        if (ke.key === 'Enter') {
          this.confirm();
        } else if (ke.key === 'Escape') {
          this.hide();
        }
      });
    });

    // 颜色预设点击
    const colorPresets = this.dialog.querySelectorAll('.color-preset');
    const colorInput = this.dialog.querySelector('.add-site-color-input') as HTMLInputElement;

    colorPresets.forEach(preset => {
      preset.addEventListener('click', () => {
        const color = (preset as HTMLElement).dataset.color || '#3b82f6';
        colorPresets.forEach(p => p.classList.remove('active'));
        preset.classList.add('active');
        colorInput.value = color;
        this.updatePreview();
      });
    });

    // 颜色选择器变化
    colorInput?.addEventListener('input', () => {
      colorPresets.forEach(p => p.classList.remove('active'));
      this.updatePreview();
    });

    // 名称输入时更新预览
    const nameInput = this.dialog.querySelector('.add-site-name-input') as HTMLInputElement;
    nameInput?.addEventListener('input', () => {
      this.updatePreview();
    });
  }

  /** 生成网站图标缩写 */
  private generateAbbr(name: string): string {
    if (!name) return '';
    const trimmed = name.trim();
    if (!trimmed) return '';
    
    // 检查第一个字符是否为中文
    const firstChar = trimmed.charAt(0);
    const isChinese = /[\u4e00-\u9fa5]/.test(firstChar);
    
    if (isChinese) {
      // 中文：取第一个汉字
      return firstChar;
    } else {
      // 英文：取前两个字母大写
      const letters = trimmed.replace(/[^a-zA-Z]/g, '');
      if (letters.length >= 2) {
        return letters.substring(0, 2).toUpperCase();
      } else if (letters.length === 1) {
        return letters.toUpperCase();
      }
      return trimmed.charAt(0).toUpperCase();
    }
  }

  /** 更新预览 */
  private updatePreview(): void {
    if (!this.dialog) return;
    
    const nameInput = this.dialog.querySelector('.add-site-name-input') as HTMLInputElement;
    const colorInput = this.dialog.querySelector('.add-site-color-input') as HTMLInputElement;
    const previewIcon = this.dialog.querySelector('.add-site-preview-icon') as HTMLElement;
    
    if (!previewIcon) return;
    
    const name = nameInput?.value.trim() || '';
    const color = colorInput?.value || '#3b82f6';
    const abbr = this.generateAbbr(name);
    
    previewIcon.style.background = color;
    previewIcon.textContent = abbr;
  }

  /** 显示添加对话框 */
  show(categoryId: string): void {
    this.targetCategory = categoryId;
    if (!this.dialog) return;

    // 重置表单
    const nameInput = this.dialog.querySelector('.add-site-name-input') as HTMLInputElement;
    const urlInput = this.dialog.querySelector('.add-site-url-input') as HTMLInputElement;
    const colorInput = this.dialog.querySelector('.add-site-color-input') as HTMLInputElement;
    const colorPresets = this.dialog.querySelectorAll('.color-preset');
    const previewIcon = this.dialog.querySelector('.add-site-preview-icon') as HTMLElement;
    const categorySelect = this.dialog.querySelector('.add-site-category-select') as HTMLSelectElement;

    if (nameInput) nameInput.value = '';
    if (urlInput) urlInput.value = '';
    if (colorInput) colorInput.value = '#3b82f6';
    
    // 填充目录下拉选择
    if (categorySelect) {
      const categories = categoryManager.getCategories();
      categorySelect.innerHTML = categories.map(cat => {
        const displayTitle = i18n.getCategoryTitle(cat.id, cat.title);
        return `<option value="${cat.id}" ${cat.id === categoryId ? 'selected' : ''}>${cat.icon} ${displayTitle}</option>`;
      }).join('');
    }
    
    // 重置颜色预设选中状态
    colorPresets.forEach((p, i) => {
      if (i === 0) p.classList.add('active');
      else p.classList.remove('active');
    });
    
    // 重置预览
    if (previewIcon) {
      previewIcon.style.background = '#3b82f6';
      previewIcon.textContent = '';
    }

    // 显示对话框
    this.dialog.style.display = 'flex';

    // 聚焦到名称输入框
    setTimeout(() => nameInput?.focus(), 100);
  }

  /** 隐藏对话框 */
  hide(): void {
    if (this.dialog) {
      this.dialog.style.display = 'none';
    }
    this.targetCategory = null;
  }

  /** 确认添加 */
  private confirm(): void {
    const categorySelect = this.dialog?.querySelector('.add-site-category-select') as HTMLSelectElement;
    const targetCategory = categorySelect?.value || this.targetCategory;
    
    if (!targetCategory) return;

    const nameInput = this.dialog?.querySelector('.add-site-name-input') as HTMLInputElement;
    const urlInput = this.dialog?.querySelector('.add-site-url-input') as HTMLInputElement;
    const colorInput = this.dialog?.querySelector('.add-site-color-input') as HTMLInputElement;

    const name = nameInput?.value.trim();
    let url = urlInput?.value.trim();
    const color = colorInput?.value || '#3b82f6';

    if (!name) {
      nameInput?.focus();
      nameInput?.classList.add('shake');
      setTimeout(() => nameInput?.classList.remove('shake'), 500);
      return;
    }

    if (!url) {
      urlInput?.focus();
      urlInput?.classList.add('shake');
      setTimeout(() => urlInput?.classList.remove('shake'), 500);
      return;
    }

    // 自动补全 https
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    // 使用名称缩写作为图标
    const icon = this.generateAbbr(name);

    const item = categoryManager.addCustomSite(name, url, icon, color, targetCategory);
    toast({ message: i18n.t('app.siteAdded', '', { name }), duration: 2000 });
    this.hide();
    
    this.callbacks.onItemAdded?.(item);
    this.callbacks.switchToItem?.(item.key);
  }

  /** 显示编辑对话框 */
  showEdit(key: string, currentKey: string | null): void {
    const item = categoryManager.getItem(key);
    if (!item || item.type !== 'custom-site') return;

    const currentCategory = categoryManager.getItemCategory(key);
    const categories = categoryManager.getCategories();
    const categoryOptions = categories.map(cat => {
      const displayTitle = i18n.getCategoryTitle(cat.id, cat.title);
      return `<option value="${cat.id}" ${cat.id === currentCategory?.id ? 'selected' : ''}>${cat.icon} ${displayTitle}</option>`;
    }).join('');

    const dialog = document.createElement('div');
    dialog.className = 'add-site-overlay';
    dialog.innerHTML = `
      <div class="add-site-dialog">
        <div class="add-site-header">
          <div class="add-site-title">${i18n.t('app.editSite')}</div>
          <button class="add-site-close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div class="add-site-body">
          <div class="add-site-preview">
            <div class="add-site-preview-icon" style="background: ${item.color}">${item.icon}</div>
          </div>
          <div class="add-site-field">
            <label>${i18n.t('app.siteName')}</label>
            <input type="text" class="add-site-name-input" value="${item.title}" />
          </div>
          <div class="add-site-field">
            <label>${i18n.t('app.siteUrl')}</label>
            <input type="text" class="add-site-url-input" value="${item.url || ''}" />
          </div>
          <div class="add-site-field">
            <label>${i18n.t('app.category')}</label>
            <select class="add-site-category-select">${categoryOptions}</select>
          </div>
          <div class="add-site-field">
            <label>${i18n.t('app.iconColor')}</label>
            <div class="add-site-color-row">
              <div class="add-site-color-presets">
                ${this.generateColorPresets(item.color)}
              </div>
              <input type="color" class="add-site-color-input" value="${item.color}" />
            </div>
          </div>
        </div>
        <div class="add-site-footer">
          <button class="edit-site-delete">${i18n.t('common.delete')}</button>
          <div style="flex:1"></div>
          <button class="add-site-cancel">${i18n.t('common.cancel')}</button>
          <button class="add-site-confirm">${i18n.t('common.save')}</button>
        </div>
      </div>
    `;

    const nameInput = dialog.querySelector('.add-site-name-input') as HTMLInputElement;
    const urlInput = dialog.querySelector('.add-site-url-input') as HTMLInputElement;
    const colorInput = dialog.querySelector('.add-site-color-input') as HTMLInputElement;
    const categorySelect = dialog.querySelector('.add-site-category-select') as HTMLSelectElement;
    const previewIcon = dialog.querySelector('.add-site-preview-icon') as HTMLElement;
    const colorPresets = dialog.querySelectorAll('.color-preset');

    // 更新预览函数
    const updatePreview = () => {
      const name = nameInput?.value.trim() || '';
      const color = colorInput?.value || '#3b82f6';
      const abbr = this.generateAbbr(name);
      previewIcon.style.background = color;
      previewIcon.textContent = abbr;
    };

    // 名称输入时更新预览
    nameInput?.addEventListener('input', updatePreview);

    // 颜色预设点击
    colorPresets.forEach(preset => {
      preset.addEventListener('click', () => {
        const color = (preset as HTMLElement).dataset.color || '#3b82f6';
        colorPresets.forEach(p => p.classList.remove('active'));
        preset.classList.add('active');
        colorInput.value = color;
        updatePreview();
      });
    });

    // 颜色选择器变化
    colorInput?.addEventListener('input', () => {
      colorPresets.forEach(p => p.classList.remove('active'));
      updatePreview();
    });

    dialog.querySelector('.add-site-cancel')?.addEventListener('click', () => dialog.remove());
    dialog.querySelector('.add-site-close')?.addEventListener('click', () => dialog.remove());
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) dialog.remove();
    });

    dialog.querySelector('.edit-site-delete')?.addEventListener('click', () => {
      if (confirm(i18n.t('app.confirmDelete', '', { name: item.title }))) {
        // 如果删除的是当前显示的网站，切换到其他
        if (currentKey === key) {
          const categories = categoryManager.getCategories();
          const firstItem = categories[0]?.items[0];
          if (firstItem) {
            this.callbacks.switchToItem?.(firstItem);
          }
        }
        // 删除 webview
        this.callbacks.onWebviewRemove?.(key);
        categoryManager.deleteCustomSite(key);
        toast({ message: i18n.t('app.deleted'), duration: 2000 });
        dialog.remove();
        this.callbacks.onItemDeleted?.(key);
      }
    });

    dialog.querySelector('.add-site-confirm')?.addEventListener('click', () => {
      const name = nameInput?.value.trim();
      let url = urlInput?.value.trim();
      const color = colorInput?.value;
      const newCategoryId = categorySelect?.value;

      if (!name || !url) {
        toast({ message: i18n.t('app.fillNameAndUrl'), duration: 2000 });
        return;
      }

      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }

      // 使用名称缩写作为图标
      const icon = this.generateAbbr(name);

      categoryManager.updateCustomSite(key, { title: name, url, icon, color });
      
      // 如果目录变了，移动项目
      if (newCategoryId && newCategoryId !== currentCategory?.id) {
        categoryManager.moveItem(key, newCategoryId);
      }

      toast({ message: i18n.t('app.saved'), duration: 2000 });
      dialog.remove();
    });

    document.body.appendChild(dialog);
    setTimeout(() => nameInput?.focus(), 0);
  }

  private generateColorPresets(currentColor: string): string {
    const colors = [
      '#3b82f6', '#10b981', '#22c55e', '#f59e0b', '#f97316', '#ef4444',
      '#dc2626', '#8b5cf6', '#7c3aed', '#ec4899', '#d946ef', '#06b6d4',
      '#0ea5e9', '#14b8a6', '#6b7280', '#374151'
    ];
    return colors.map(color => 
      `<div class="color-preset ${currentColor === color ? 'active' : ''}" data-color="${color}" style="background: ${color}"></div>`
    ).join('');
  }
}
