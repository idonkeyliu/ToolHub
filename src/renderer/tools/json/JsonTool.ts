/**
 * JSON 格式化工具
 */

import { Tool } from '../../core/Tool';
import type { ToolConfig } from '../../types/index';
import { ToolCategory, EventType } from '../../types/index';
import { createElement } from '../../utils/dom';
import { copyText } from '../../utils/clipboard';
import { eventBus } from '../../core/EventBus';
import { getTemplate } from './template';
import { i18n } from '../../core/i18n';

type ParseResult =
  | { ok: true; data: unknown }
  | { ok: false; err: Error };

export class JsonTool extends Tool {
  static readonly config: ToolConfig = {
    key: 'json',
    title: 'JSON',
    category: ToolCategory.DEVELOPER,
    icon: '📋',
    description: i18n.t('tool.jsonDesc'),
    keywords: ['json', 'format', 'parse'],
  };

  config = JsonTool.config;

  private inputEl: HTMLTextAreaElement | null = null;
  private outputEl: HTMLElement | null = null;
  private errorEl: HTMLElement | null = null;
  private mode: 'tree' | 'raw' = 'tree';

  render(): HTMLElement {
    return createElement('div', {
      className: 'json-view',
      innerHTML: getTemplate(),
    });
  }

  protected bindEvents(): void {
    this.inputEl = this.querySelector<HTMLTextAreaElement>('#jsonIn');
    this.outputEl = this.querySelector<HTMLElement>('#jsonOut');
    this.errorEl = this.querySelector<HTMLElement>('#jsonErr');

    // 工具栏按钮
    this.bindButton('#jsonFmt', () => this.handleFormat());
    this.bindButton('#jsonMin', () => this.handleMinify());
    this.bindButton('#jsonSort', () => this.handleSort());
    this.bindButton('#jsonCopy', () => this.handleCopy());
    this.bindButton('#jsonExpand', () => this.handleExpandAll());
    this.bindButton('#jsonCollapse', () => this.handleCollapseAll());
    this.bindButton('#jsonPaste', () => this.handlePaste());
    this.bindButton('#jsonClear', () => this.handleClear());

    // 输入监听
    if (this.inputEl) {
      this.addEventListener(this.inputEl, 'input', () => this.refresh());
    }

    // 标签页切换
    const tabs = this.querySelectorAll<HTMLElement>('.json-tab');
    tabs.forEach((tab) => {
      this.addEventListener(tab, 'click', () => {
        tabs.forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        this.mode = (tab.dataset.t as 'tree' | 'raw') || 'tree';
        this.refresh();
      });
    });
  }

  protected onActivated(): void {
    this.refresh();
    setTimeout(() => this.inputEl?.focus(), 100);
  }

  // ==================== 操作方法 ====================

  private handleFormat(): void {
    const text = this.inputEl?.value || '';
    const parsed = this.safeParse(text);
    if (!parsed.ok) {
      this.showError(i18n.t('json.parseFailed'));
      return;
    }
    if (this.inputEl) {
      this.inputEl.value = JSON.stringify(parsed.data, null, 2);
    }
    this.refresh();
  }

  private handleMinify(): void {
    const text = this.inputEl?.value || '';
    const parsed = this.safeParse(text);
    if (!parsed.ok) {
      this.showError(i18n.t('json.parseFailed'));
      return;
    }
    if (this.inputEl) {
      this.inputEl.value = JSON.stringify(parsed.data);
    }
    this.refresh();
  }

  private handleSort(): void {
    const text = this.inputEl?.value || '';
    const parsed = this.safeParse(text);
    if (!parsed.ok) {
      this.showError(i18n.t('json.parseFailed'));
      return;
    }
    const sorted = this.sortKeys(parsed.data);
    if (this.inputEl) {
      this.inputEl.value = JSON.stringify(sorted, null, 2);
    }
    this.refresh();
  }

  private handleCopy(): void {
    const text = this.outputEl?.textContent || '';
    if (text) {
      copyText(text).then(() => {
        eventBus.emit(EventType.TOAST_SHOW, { message: i18n.t('common.copied'), duration: 1300 });
      });
    }
  }

  private handleExpandAll(): void {
    if (!this.outputEl) return;
    this.outputEl.querySelectorAll('.jt-node').forEach((n) => {
      n.classList.remove('collapsed');
    });
  }

  private handleCollapseAll(): void {
    if (!this.outputEl) return;
    this.outputEl.querySelectorAll('.jt-node').forEach((n) => {
      n.classList.add('collapsed');
    });
  }

  private async handlePaste(): Promise<void> {
    try {
      const text = await navigator.clipboard.readText();
      if (this.inputEl) {
        this.inputEl.value = text;
        this.refresh();
      }
    } catch {
      this.showError(i18n.t('json.clipboardReadFailed'));
    }
  }

  private handleClear(): void {
    if (this.inputEl) {
      this.inputEl.value = '';
      this.refresh();
    }
  }

  // ==================== 核心逻辑 ====================

  private refresh(): void {
    const text = this.inputEl?.value || '';
    if (!text.trim()) {
      if (this.outputEl) this.outputEl.textContent = '';
      this.showError('');
      return;
    }

    const parsed = this.safeParse(text);
    if (!parsed.ok) {
      if (this.outputEl) this.outputEl.textContent = '';
      this.showError(i18n.t('json.parseFailed'));
      return;
    }

    this.showError('');

    if (this.mode === 'tree') {
      this.renderTree(parsed.data);
    } else {
      this.renderRaw(parsed.data);
    }
  }

  private safeParse(text: string): ParseResult {
    try {
      return { ok: true, data: JSON.parse(text) };
    } catch (e) {
      return { ok: false, err: e as Error };
    }
  }

  private sortKeys(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.sortKeys(item));
    }
    if (value && typeof value === 'object') {
      const obj = value as Record<string, unknown>;
      return Object.keys(obj)
        .sort()
        .reduce((acc, k) => {
          acc[k] = this.sortKeys(obj[k]);
          return acc;
        }, {} as Record<string, unknown>);
    }
    return value;
  }

  private showError(msg: string): void {
    if (this.errorEl) {
      this.errorEl.textContent = msg || '';
    }
  }

  // ==================== 渲染方法 ====================

  private renderTree(value: unknown): void {
    if (!this.outputEl) return;

    const root = document.createElement('div');
    root.className = 'jtree';
    root.appendChild(this.makeNode(undefined, value, 0));

    this.outputEl.innerHTML = '';
    this.outputEl.appendChild(root);
  }

  private renderRaw(value: unknown): void {
    if (!this.outputEl) return;
    this.outputEl.textContent = JSON.stringify(value, null, 2);
  }

  private makeNode(key: string | number | undefined, value: unknown, depth: number): HTMLElement {
    const isArray = Array.isArray(value);
    const valueType = value === null ? 'null' : typeof value;

    const li = document.createElement('div');
    li.className = 'jt-node';

    const head = document.createElement('div');
    head.className = 'jt-head';

    // 折叠箭头或叶子占位
    const caret = document.createElement('span');
    caret.className = isArray || valueType === 'object' ? 'jt-caret' : 'jt-leaf';
    head.appendChild(caret);

    // 键名
    if (key !== undefined) {
      const keyEl = document.createElement('span');
      keyEl.className = 'jt-key';
      keyEl.textContent = typeof key === 'string' ? `"${key}"` : String(key);
      head.appendChild(keyEl);
      head.appendChild(document.createTextNode(':'));
    }

    // 简单值
    if (valueType === 'string' || valueType === 'number' || valueType === 'boolean' || valueType === 'null') {
      const valEl = document.createElement('span');
      valEl.className = 'jt-val ' + this.getValueClass(valueType);
      valEl.textContent = valueType === 'string' ? `"${value}"` : String(value);
      head.appendChild(valEl);
      li.appendChild(head);
      return li;
    }

    // 对象/数组摘要
    const summary = document.createElement('span');
    summary.className = 'jt-sum';
    if (isArray) {
      summary.textContent = `[${(value as unknown[]).length}]`;
    } else {
      summary.textContent = `{${Object.keys(value as object || {}).length}}`;
    }
    head.appendChild(summary);
    li.appendChild(head);

    // 子节点
    const children = document.createElement('div');
    children.className = 'jt-children';

    if (isArray) {
      (value as unknown[]).forEach((item, idx) => {
        children.appendChild(this.makeNode(idx, item, depth + 1));
      });
    } else {
      Object.keys(value as object || {}).forEach((k) => {
        children.appendChild(this.makeNode(k, (value as Record<string, unknown>)[k], depth + 1));
      });
    }

    li.appendChild(children);

    // 点击折叠/展开
    head.addEventListener('click', () => {
      if (isArray || valueType === 'object') {
        li.classList.toggle('collapsed');
      }
    });

    return li;
  }

  private getValueClass(type: string): string {
    switch (type) {
      case 'string':
        return 's';
      case 'number':
        return 'n';
      case 'boolean':
        return 'b';
      case 'null':
        return 'null';
      default:
        return '';
    }
  }

  // ==================== 辅助方法 ====================

  private bindButton(selector: string, handler: () => void): void {
    const btn = this.querySelector<HTMLButtonElement>(selector);
    if (btn) {
      this.addEventListener(btn, 'click', handler);
    }
  }
}
