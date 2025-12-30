/**
 * 自定义网站添加/编辑弹窗
 */

import { customSiteManager, CustomSite, CUSTOM_SITE_CATEGORIES } from '../core/CustomSiteManager';

export interface CustomSiteModalOptions {
  onSave?: (site: CustomSite) => void;
  onDelete?: (id: string) => void;
}

// 预设颜色
const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#10b981', '#14b8a6',
  '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
];

export class CustomSiteModal {
  private modal: HTMLElement | null = null;
  private editingId: string | null = null;
  private options: CustomSiteModalOptions;

  constructor(options: CustomSiteModalOptions = {}) {
    this.options = options;
    this.createModal();
  }

  private createModal(): void {
    // 检查是否已存在
    if (document.getElementById('customSiteModal')) {
      this.modal = document.getElementById('customSiteModal');
      return;
    }

    const modal = document.createElement('div');
    modal.id = 'customSiteModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-container custom-site-modal">
        <div class="modal-header">
          <h2 id="customSiteModalTitle">添加自定义网站</h2>
          <button class="modal-close" id="customSiteClose">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="modal-body custom-site-body">
          <div class="form-group">
            <label for="customSiteName">网站名称</label>
            <input type="text" id="customSiteName" placeholder="例如：我的网站" maxlength="20" />
          </div>
          <div class="form-group">
            <label for="customSiteUrl">网站地址</label>
            <input type="url" id="customSiteUrl" placeholder="https://example.com" />
          </div>
          <div class="form-group">
            <label for="customSiteIcon">图标文字（1-2个字符）</label>
            <input type="text" id="customSiteIcon" placeholder="例如：🌐 或 MY" maxlength="2" />
          </div>
          <div class="form-group">
            <label>分类</label>
            <div class="category-picker" id="categoryPicker">
              ${CUSTOM_SITE_CATEGORIES.map((cat, i) => `
                <div class="category-option ${i === 0 ? 'selected' : ''}" data-category="${cat.key}">
                  <span class="category-icon">${cat.icon}</span>
                  <span class="category-label">${cat.label}</span>
                </div>
              `).join('')}
              <div class="category-option category-custom" data-category="custom">
                <span class="category-icon">✏️</span>
                <span class="category-label">自定义</span>
              </div>
            </div>
            <input type="text" id="customCategoryInput" class="custom-category-input" placeholder="输入自定义分类名称" style="display:none" />
            <input type="hidden" id="customSiteCategory" value="${CUSTOM_SITE_CATEGORIES[0].key}" />
          </div>
          <div class="form-group">
            <label>选择颜色</label>
            <div class="color-picker" id="colorPicker">
              ${PRESET_COLORS.map(color => `
                <div class="color-option" data-color="${color}" style="background:${color}"></div>
              `).join('')}
            </div>
            <input type="hidden" id="customSiteColor" value="${PRESET_COLORS[0]}" />
          </div>
          <div class="form-actions">
            <button class="btn btn-danger" id="customSiteDelete" style="display:none">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
              删除
            </button>
            <div class="form-actions-right">
              <button class="btn btn-secondary" id="customSiteCancel">取消</button>
              <button class="btn btn-primary" id="customSiteSave">保存</button>
            </div>
          </div>
        </div>
        <!-- 删除确认对话框 -->
        <div class="delete-confirm-overlay" id="deleteConfirmOverlay">
          <div class="delete-confirm-dialog">
            <p>确定要删除这个自定义网站吗？</p>
            <div class="delete-confirm-actions">
              <button class="btn btn-secondary" id="deleteCancel">取消</button>
              <button class="btn btn-danger" id="deleteConfirm">删除</button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.modal = modal;
    this.bindEvents();
  }

  private bindEvents(): void {
    if (!this.modal) return;

    // 关闭按钮
    const closeBtn = this.modal.querySelector('#customSiteClose');
    closeBtn?.addEventListener('click', () => this.close());

    // 取消按钮
    const cancelBtn = this.modal.querySelector('#customSiteCancel');
    cancelBtn?.addEventListener('click', () => this.close());

    // 点击遮罩关闭
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this.close();
    });

    // 颜色选择
    const colorPicker = this.modal.querySelector('#colorPicker');
    const colorInput = this.modal.querySelector('#customSiteColor') as HTMLInputElement;
    colorPicker?.querySelectorAll('.color-option').forEach(option => {
      option.addEventListener('click', () => {
        colorPicker.querySelectorAll('.color-option').forEach(o => o.classList.remove('selected'));
        option.classList.add('selected');
        colorInput.value = option.getAttribute('data-color') || PRESET_COLORS[0];
      });
    });

    // 分类选择
    const categoryPicker = this.modal.querySelector('#categoryPicker');
    const categoryInput = this.modal.querySelector('#customSiteCategory') as HTMLInputElement;
    const customCategoryInput = this.modal.querySelector('#customCategoryInput') as HTMLInputElement;
    
    categoryPicker?.querySelectorAll('.category-option').forEach(option => {
      option.addEventListener('click', () => {
        categoryPicker.querySelectorAll('.category-option').forEach(o => o.classList.remove('selected'));
        option.classList.add('selected');
        
        const category = option.getAttribute('data-category') || CUSTOM_SITE_CATEGORIES[0].key;
        
        // 如果是自定义分类，显示输入框
        if (category === 'custom') {
          customCategoryInput.style.display = 'block';
          customCategoryInput.focus();
          categoryInput.value = customCategoryInput.value || 'custom';
        } else {
          customCategoryInput.style.display = 'none';
          categoryInput.value = category;
        }
      });
    });
    
    // 自定义分类输入
    customCategoryInput?.addEventListener('input', () => {
      categoryInput.value = customCategoryInput.value || 'custom';
    });

    // 保存按钮
    const saveBtn = this.modal.querySelector('#customSiteSave');
    saveBtn?.addEventListener('click', () => this.save());

    // 删除按钮 - 显示确认对话框
    const deleteBtn = this.modal.querySelector('#customSiteDelete');
    deleteBtn?.addEventListener('click', () => this.showDeleteConfirm());

    // 删除确认对话框
    const deleteConfirmOverlay = this.modal.querySelector('#deleteConfirmOverlay');
    const deleteCancel = this.modal.querySelector('#deleteCancel');
    const deleteConfirm = this.modal.querySelector('#deleteConfirm');
    
    deleteCancel?.addEventListener('click', () => this.hideDeleteConfirm());
    deleteConfirm?.addEventListener('click', () => this.confirmDelete());
    deleteConfirmOverlay?.addEventListener('click', (e) => {
      if (e.target === deleteConfirmOverlay) this.hideDeleteConfirm();
    });

    // Enter 键保存
    this.modal.querySelectorAll('input').forEach(input => {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.save();
      });
    });
  }

  /** 打开弹窗（新增模式） */
  open(): void {
    this.editingId = null;
    this.reset();
    
    const title = this.modal?.querySelector('#customSiteModalTitle');
    if (title) title.textContent = '添加自定义网站';
    
    const deleteBtn = this.modal?.querySelector('#customSiteDelete') as HTMLElement;
    if (deleteBtn) deleteBtn.style.display = 'none';
    
    this.modal?.classList.add('show');
    
    // 聚焦到名称输入框
    setTimeout(() => {
      (this.modal?.querySelector('#customSiteName') as HTMLInputElement)?.focus();
    }, 100);
  }

  /** 打开弹窗（编辑模式） */
  edit(id: string): void {
    const site = customSiteManager.get(id);
    if (!site) return;

    this.editingId = id;
    this.reset();
    
    const title = this.modal?.querySelector('#customSiteModalTitle');
    if (title) title.textContent = '编辑自定义网站';
    
    const deleteBtn = this.modal?.querySelector('#customSiteDelete') as HTMLElement;
    if (deleteBtn) deleteBtn.style.display = 'block';
    
    // 填充表单
    const nameInput = this.modal?.querySelector('#customSiteName') as HTMLInputElement;
    const urlInput = this.modal?.querySelector('#customSiteUrl') as HTMLInputElement;
    const iconInput = this.modal?.querySelector('#customSiteIcon') as HTMLInputElement;
    const colorInput = this.modal?.querySelector('#customSiteColor') as HTMLInputElement;
    const categoryInput = this.modal?.querySelector('#customSiteCategory') as HTMLInputElement;
    
    if (nameInput) nameInput.value = site.name;
    if (urlInput) urlInput.value = site.url;
    if (iconInput) iconInput.value = site.icon || '';
    if (colorInput) colorInput.value = site.color;
    if (categoryInput) categoryInput.value = site.category || CUSTOM_SITE_CATEGORIES[0].key;
    
    // 选中颜色
    this.modal?.querySelectorAll('.color-option').forEach(option => {
      option.classList.toggle('selected', option.getAttribute('data-color') === site.color);
    });
    
    // 选中分类
    this.modal?.querySelectorAll('.category-option').forEach(option => {
      option.classList.toggle('selected', option.getAttribute('data-category') === (site.category || CUSTOM_SITE_CATEGORIES[0].key));
    });
    
    this.modal?.classList.add('show');
  }

  /** 关闭弹窗 */
  close(): void {
    this.modal?.classList.remove('show');
    this.editingId = null;
  }

  /** 重置表单 */
  private reset(): void {
    const nameInput = this.modal?.querySelector('#customSiteName') as HTMLInputElement;
    const urlInput = this.modal?.querySelector('#customSiteUrl') as HTMLInputElement;
    const iconInput = this.modal?.querySelector('#customSiteIcon') as HTMLInputElement;
    const colorInput = this.modal?.querySelector('#customSiteColor') as HTMLInputElement;
    const categoryInput = this.modal?.querySelector('#customSiteCategory') as HTMLInputElement;
    
    if (nameInput) nameInput.value = '';
    if (urlInput) urlInput.value = '';
    if (iconInput) iconInput.value = '';
    if (colorInput) colorInput.value = PRESET_COLORS[0];
    if (categoryInput) categoryInput.value = CUSTOM_SITE_CATEGORIES[0].key;
    
    // 重置颜色选择
    this.modal?.querySelectorAll('.color-option').forEach((option, i) => {
      option.classList.toggle('selected', i === 0);
    });
    
    // 重置分类选择
    this.modal?.querySelectorAll('.category-option').forEach((option, i) => {
      option.classList.toggle('selected', i === 0);
    });
  }

  /** 保存 */
  private save(): void {
    const nameInput = this.modal?.querySelector('#customSiteName') as HTMLInputElement;
    const urlInput = this.modal?.querySelector('#customSiteUrl') as HTMLInputElement;
    const iconInput = this.modal?.querySelector('#customSiteIcon') as HTMLInputElement;
    const colorInput = this.modal?.querySelector('#customSiteColor') as HTMLInputElement;
    const categoryInput = this.modal?.querySelector('#customSiteCategory') as HTMLInputElement;

    const name = nameInput?.value.trim();
    let url = urlInput?.value.trim();
    const icon = iconInput?.value.trim();
    const color = colorInput?.value || PRESET_COLORS[0];
    const category = categoryInput?.value || CUSTOM_SITE_CATEGORIES[0].key;

    // 验证
    if (!name) {
      nameInput?.focus();
      this.showError('请输入网站名称');
      return;
    }

    if (!url) {
      urlInput?.focus();
      this.showError('请输入网站地址');
      return;
    }

    // 自动补全 https://
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    // 验证 URL 格式
    try {
      new URL(url);
    } catch {
      urlInput?.focus();
      this.showError('请输入有效的网站地址');
      return;
    }

    const siteData = {
      name,
      url,
      icon: icon || name.slice(0, 2),
      color,
      category,
    };

    let site: CustomSite;
    if (this.editingId) {
      customSiteManager.update(this.editingId, siteData);
      site = customSiteManager.get(this.editingId)!;
    } else {
      site = customSiteManager.add(siteData);
    }

    this.options.onSave?.(site);
    this.close();
  }

  /** 显示删除确认对话框 */
  private showDeleteConfirm(): void {
    const overlay = this.modal?.querySelector('#deleteConfirmOverlay') as HTMLElement;
    if (overlay) overlay.classList.add('show');
  }

  /** 隐藏删除确认对话框 */
  private hideDeleteConfirm(): void {
    const overlay = this.modal?.querySelector('#deleteConfirmOverlay') as HTMLElement;
    if (overlay) overlay.classList.remove('show');
  }

  /** 确认删除 */
  private confirmDelete(): void {
    if (!this.editingId) return;
    
    customSiteManager.delete(this.editingId);
    this.options.onDelete?.(this.editingId);
    this.hideDeleteConfirm();
    this.close();
  }

  /** 显示错误提示 */
  private showError(message: string): void {
    // 简单的错误提示，可以后续改为更好的 UI
    alert(message);
  }
}
