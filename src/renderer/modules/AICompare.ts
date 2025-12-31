/**
 * AI 对比功能模块
 */

import { toast } from '../components/Toast';

interface AIPanel {
  key: string;
  name: string;
  url: string;
  webview?: HTMLElement;
}

export class AICompare {
  private panels: AIPanel[] = [];
  private initialized = false;

  private readonly defaultPanels: AIPanel[] = [
    { key: 'chatgpt', name: 'ChatGPT', url: 'https://chatgpt.com' },
    { key: 'claude', name: 'Claude', url: 'https://claude.ai' },
    { key: 'gemini', name: 'Gemini', url: 'https://gemini.google.com/app' },
    { key: 'poe', name: 'Poe', url: 'https://poe.com' }
  ];

  constructor() {}

  /** 初始化事件监听 */
  init(): void {
    // 打开按钮
    const openBtn = document.getElementById('aiCompareBtnGlobal');
    openBtn?.addEventListener('click', () => this.show());

    // 关闭按钮
    const closeBtn = document.getElementById('aiCompareClose');
    closeBtn?.addEventListener('click', () => this.hide());

    // ESC 关闭
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const overlay = document.getElementById('aiCompareOverlay');
        if (overlay?.classList.contains('visible')) {
          this.hide();
        }
      }
    });

    // 输入框和提交
    const input = document.getElementById('aiCompareInput') as HTMLTextAreaElement;
    const submitBtn = document.getElementById('aiCompareSubmit');

    // Enter 提交（Shift+Enter 换行）
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.submitQuestion();
      }
    });

    submitBtn?.addEventListener('click', () => this.submitQuestion());
  }

  /** 显示 AI 对比面板 */
  show(): void {
    const overlay = document.getElementById('aiCompareOverlay');
    if (!overlay) return;

    overlay.classList.add('visible');
    
    if (!this.initialized) {
      this.panels = [...this.defaultPanels];
      this.renderPanels();
      this.initialized = true;
    }
  }

  /** 隐藏 AI 对比面板 */
  hide(): void {
    const overlay = document.getElementById('aiCompareOverlay');
    overlay?.classList.remove('visible');
  }

  /** 渲染 AI 面板 */
  private renderPanels(): void {
    const grid = document.getElementById('aiCompareGrid');
    if (!grid) return;

    grid.innerHTML = '';
    
    // 更新网格列数
    const panelCount = Math.max(this.panels.length, 1);
    grid.style.gridTemplateColumns = `repeat(${panelCount}, 1fr)`;

    this.panels.forEach((panel, index) => {
      const panelEl = this.createPanel(panel, index);
      grid.appendChild(panelEl);
    });

    // 如果面板数少于 4 个，添加空白占位面板
    if (this.panels.length < 4) {
      const emptyPanel = this.createEmptyPanel();
      grid.appendChild(emptyPanel);
      grid.style.gridTemplateColumns = `repeat(${this.panels.length + 1}, 1fr)`;
    }
  }

  /** 创建 AI 面板 */
  private createPanel(panel: AIPanel, index: number): HTMLElement {
    const div = document.createElement('div');
    div.className = 'ai-compare-panel';
    div.setAttribute('data-index', String(index));
    div.innerHTML = `
      <div class="ai-panel-header">
        <span class="ai-panel-name">${panel.name}</span>
        <div class="ai-panel-actions">
          <div class="ai-panel-btn ai-panel-refresh" title="刷新">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23 4 23 10 17 10"></polyline>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
            </svg>
          </div>
          <div class="ai-panel-btn ai-panel-external" title="在浏览器中打开">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15 3 21 3 21 9"/>
              <line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
          </div>
          <div class="ai-panel-btn ai-panel-close" title="移除">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </div>
        </div>
      </div>
      <div class="ai-panel-webview"></div>
    `;

    // 创建 webview
    const webviewContainer = div.querySelector('.ai-panel-webview')!;
    const webview = document.createElement('webview');
    webview.setAttribute('src', panel.url);
    webview.setAttribute('partition', `persist:ai-compare-${panel.key}`);
    webview.setAttribute('allowpopups', 'true');
    webview.style.cssText = 'width: 100%; height: 100%;';
    webviewContainer.appendChild(webview);
    panel.webview = webview;

    // 事件监听
    div.querySelector('.ai-panel-refresh')?.addEventListener('click', () => {
      (panel.webview as any)?.reload?.();
    });

    div.querySelector('.ai-panel-external')?.addEventListener('click', () => {
      (window as any).llmHub?.openExternal?.(panel.url);
    });

    div.querySelector('.ai-panel-close')?.addEventListener('click', () => {
      this.removePanel(index);
    });

    // 拖拽放置
    div.addEventListener('dragover', (e) => {
      e.preventDefault();
      div.classList.add('drag-over');
    });

    div.addEventListener('dragleave', () => {
      div.classList.remove('drag-over');
    });

    div.addEventListener('drop', (e) => {
      e.preventDefault();
      div.classList.remove('drag-over');
      this.handleDrop(e, index);
    });

    return div;
  }

  /** 创建空白面板 */
  private createEmptyPanel(): HTMLElement {
    const div = document.createElement('div');
    div.className = 'ai-compare-panel';
    div.innerHTML = `
      <div class="ai-panel-header">
        <span class="ai-panel-name">拖拽添加</span>
        <div class="ai-panel-actions"></div>
      </div>
      <div class="ai-panel-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        <span>从侧边栏拖拽网站到这里</span>
      </div>
    `;

    // 拖拽放置
    div.addEventListener('dragover', (e) => {
      e.preventDefault();
      div.classList.add('drag-over');
    });

    div.addEventListener('dragleave', () => {
      div.classList.remove('drag-over');
    });

    div.addEventListener('drop', (e) => {
      e.preventDefault();
      div.classList.remove('drag-over');
      this.handleDrop(e, -1); // -1 表示添加到末尾
    });

    return div;
  }

  /** 移除面板 */
  private removePanel(index: number): void {
    if (this.panels.length <= 1) {
      toast({ message: '至少保留一个面板', duration: 1500 });
      return;
    }
    this.panels.splice(index, 1);
    this.renderPanels();
  }

  /** 处理拖拽放置 */
  private handleDrop(e: DragEvent, targetIndex: number): void {
    const data = e.dataTransfer?.getData('text/plain');
    if (!data) return;

    try {
      const item = JSON.parse(data);
      if (!item.url || !item.name) return;

      const newPanel: AIPanel = {
        key: item.key || `custom-${Date.now()}`,
        name: item.name,
        url: item.url
      };

      if (targetIndex === -1) {
        // 添加到末尾
        this.panels.push(newPanel);
      } else {
        // 替换指定位置
        this.panels[targetIndex] = newPanel;
      }

      this.renderPanels();
      toast({ message: `已添加 ${item.name}`, duration: 1500 });
    } catch {
      // 忽略解析错误
    }
  }

  /** 提交问题到所有 AI */
  private submitQuestion(): void {
    const input = document.getElementById('aiCompareInput') as HTMLTextAreaElement;
    const question = input?.value.trim();
    
    if (!question) {
      toast({ message: '请输入问题', duration: 1500 });
      return;
    }

    // 在各个 AI webview 中点击提交按钮
    this.panels.forEach((panel) => {
      if (panel.webview) {
        const script = this.getSubmitScript(panel.key);
        (panel.webview as any).executeJavaScript?.(script).catch(() => {});
      }
    });

    // 清空输入框
    input.value = '';
    input.style.height = 'auto';
    
    toast({ message: `已向 ${this.panels.length} 个 AI 发送问题`, duration: 2000 });
  }

  /** 获取提交脚本 */
  private getSubmitScript(key: string): string {
    switch (key) {
      case 'chatgpt':
        return `
          (function() {
            const btn = document.querySelector('[data-testid="send-button"]') || document.querySelector('button[aria-label*="Send"]');
            if (btn && !btn.disabled) btn.click();
          })();
        `;
      case 'claude':
        return `
          (function() {
            const btn = document.querySelector('button[aria-label="Send Message"]') || document.querySelector('button[type="submit"]');
            if (btn && !btn.disabled) btn.click();
          })();
        `;
      case 'gemini':
        return `
          (function() {
            const btn = document.querySelector('button[aria-label*="Send"]') || document.querySelector('.send-button') || document.querySelector('button[mat-icon-button]');
            if (btn && !btn.disabled) btn.click();
          })();
        `;
      case 'poe':
        return `
          (function() {
            const btn = document.querySelector('button[class*="SendButton"]') || document.querySelector('button[aria-label="Send"]');
            if (btn && !btn.disabled) btn.click();
          })();
        `;
      default:
        return `
          (function() {
            const btn = document.querySelector('button[type="submit"]') || document.querySelector('button[aria-label*="Send"]');
            if (btn && !btn.disabled) btn.click();
          })();
        `;
    }
  }

  /** 同步输入内容到各个 AI 面板的输入框 */
  syncInput(text: string): void {
    this.panels.forEach((panel) => {
      if (panel.webview) {
        const script = this.getInputSyncScript(panel.key, text);
        (panel.webview as any).executeJavaScript?.(script).catch(() => {
          // 忽略执行错误（页面可能还在加载）
        });
      }
    });
  }

  /** 获取各个 AI 平台的输入框同步脚本 */
  private getInputSyncScript(key: string, text: string): string {
    // 使用 JSON.stringify 安全转义文本
    const safeText = JSON.stringify(text);
    
    switch (key) {
      case 'chatgpt':
        return `
          (function() {
            const text = ${safeText};
            const textarea = document.querySelector('#prompt-textarea') || document.querySelector('[contenteditable="true"]');
            if (textarea) {
              if (textarea.tagName === 'TEXTAREA') {
                textarea.value = text;
                textarea.dispatchEvent(new Event('input', { bubbles: true }));
              } else {
                textarea.innerHTML = text ? '<p>' + text + '</p>' : '';
                textarea.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
              }
            }
          })();
        `;
      case 'claude':
        return `
          (function() {
            const text = ${safeText};
            const editor = document.querySelector('[contenteditable="true"].ProseMirror') || document.querySelector('.ProseMirror');
            if (editor) {
              editor.innerHTML = text ? '<p>' + text + '</p>' : '<p><br></p>';
              editor.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
            }
          })();
        `;
      case 'gemini':
        return `
          (function() {
            const text = ${safeText};
            let editor = null;
            
            const allDivs = document.querySelectorAll('div[contenteditable="true"]');
            for (const div of allDivs) {
              const placeholder = div.getAttribute('aria-placeholder') || div.getAttribute('placeholder') || div.dataset.placeholder;
              if (placeholder && (placeholder.includes('Gemini') || placeholder.includes('问问') || placeholder.includes('Ask'))) {
                editor = div;
                break;
              }
            }
            
            if (!editor) {
              const selectors = [
                '.ql-editor[contenteditable="true"]',
                'rich-textarea [contenteditable="true"]',
                '[contenteditable="true"][role="textbox"]',
                '.text-input-field [contenteditable="true"]',
                'div[contenteditable="true"][data-placeholder]'
              ];
              for (const sel of selectors) {
                editor = document.querySelector(sel);
                if (editor) break;
              }
            }
            
            if (!editor) {
              editor = document.querySelector('textarea');
            }
            
            if (editor) {
              if (editor.tagName === 'TEXTAREA') {
                editor.value = text;
                editor.dispatchEvent(new Event('input', { bubbles: true }));
              } else {
                if (text) {
                  editor.innerText = text;
                } else {
                  editor.innerHTML = '';
                }
                editor.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
              }
            }
          })();
        `;
      case 'poe':
        return `
          (function() {
            const text = ${safeText};
            const textarea = document.querySelector('textarea[class*="GrowingTextArea"]') || 
                            document.querySelector('textarea[class*="TextArea"]') || 
                            document.querySelector('textarea');
            if (textarea) {
              textarea.value = text;
              textarea.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
            }
          })();
        `;
      default:
        return `
          (function() {
            const text = ${safeText};
            const selectors = [
              'textarea',
              '[contenteditable="true"]',
              'input[type="text"]'
            ];
            for (const selector of selectors) {
              const el = document.querySelector(selector);
              if (el) {
                if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
                  el.value = text;
                } else {
                  el.innerHTML = text ? '<p>' + text + '</p>' : '';
                }
                el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
                break;
              }
            }
          })();
        `;
    }
  }
}

// 导出单例
export const aiCompare = new AICompare();
