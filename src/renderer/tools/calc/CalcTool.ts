/**
 * 计算器工具
 */

import { Tool } from '../../core/Tool';
import type { ToolConfig } from '../../types/index';
import { ToolCategory } from '../../types/index';
import { createElement } from '../../utils/dom';
import { template } from './template';
import './styles.css';

export class CalcTool extends Tool {
  static readonly config: ToolConfig = {
    key: 'calc',
    title: '计算器',
    category: ToolCategory.UTILITY,
    icon: '🧮',
    description: '支持四则运算、幂运算的科学计算器',
    keywords: ['计算器', 'calculator', '计算', '数学', 'math'],
  };

  config = CalcTool.config;

  private exprInput: HTMLInputElement | null = null;
  private resultEl: HTMLElement | null = null;

  render(): HTMLElement {
    return createElement('div', {
      className: 'calc-view',
      innerHTML: template(),
    });
  }

  protected bindEvents(): void {
    this.exprInput = this.querySelector<HTMLInputElement>('#calcExpr');
    this.resultEl = this.querySelector<HTMLElement>('#calcOut');

    // 防止按钮抢走输入框焦点
    const buttons = this.querySelectorAll<HTMLElement>('.btn');
    buttons.forEach((btn) => {
      this.addEventListener(btn, 'mousedown', (e) => e.preventDefault());
    });

    // 数字和运算符按钮
    const gridBtns = this.querySelectorAll<HTMLElement>('.calc-grid .btn[data-k]');
    gridBtns.forEach((btn) => {
      this.addEventListener(btn, 'click', () => {
        this.insertText(btn.dataset.k || '');
      });
    });

    // AC 按钮
    const acBtn = this.querySelector<HTMLElement>('.calc-row .btn[data-act="ac"]');
    if (acBtn) {
      this.addEventListener(acBtn, 'click', () => this.handleClear());
    }

    // 退格按钮
    const bkBtn = this.querySelector<HTMLElement>('.calc-row .btn[data-act="bk"]');
    if (bkBtn) {
      this.addEventListener(bkBtn, 'click', () => this.handleBackspace());
    }

    // 输入监听
    if (this.exprInput) {
      this.addEventListener(this.exprInput, 'input', () => this.evaluate());
      this.addEventListener(this.exprInput, 'keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.evaluate(true);
        }
      });
    }
  }

  protected onActivated(): void {
    this.evaluate();
    setTimeout(() => this.exprInput?.focus(), 100);
  }

  // ==================== 操作方法 ====================

  private insertText(text: string): void {
    if (!this.exprInput) return;

    const start = this.exprInput.selectionStart ?? this.exprInput.value.length;
    const end = this.exprInput.selectionEnd ?? this.exprInput.value.length;
    const value = this.exprInput.value;

    this.exprInput.value = value.slice(0, start) + text + value.slice(end);
    const pos = start + text.length;
    this.exprInput.setSelectionRange(pos, pos);
    this.exprInput.focus();
    this.evaluate();
  }

  private handleClear(): void {
    if (!this.exprInput) return;
    this.exprInput.value = '';
    if (this.resultEl) this.resultEl.textContent = '';
    try {
      this.exprInput.focus();
      this.exprInput.setSelectionRange(0, 0);
    } catch {
      // ignore
    }
    this.evaluate();
  }

  private handleBackspace(): void {
    if (!this.exprInput) return;

    let start = Number(this.exprInput.selectionStart);
    let end = Number(this.exprInput.selectionEnd);

    // 当输入未聚焦或浏览器返回无效选择时，回退到在末尾删除
    if (!Number.isInteger(start) || start < 0 || !Number.isInteger(end) || end < 0) {
      start = end = this.exprInput.value.length;
    }

    const value = this.exprInput.value;

    if (start !== end) {
      // 有选中内容，删除选中部分
      this.exprInput.value = value.slice(0, start) + value.slice(end);
      try {
        this.exprInput.focus();
        this.exprInput.setSelectionRange(start, start);
      } catch {
        // ignore
      }
    } else if (start > 0) {
      // 删除光标前一个字符
      this.exprInput.value = value.slice(0, start - 1) + value.slice(end);
      const pos = start - 1;
      try {
        this.exprInput.focus();
        this.exprInput.setSelectionRange(pos, pos);
      } catch {
        // ignore
      }
    }

    this.evaluate();
  }

  // ==================== 计算逻辑 ====================

  private evaluate(commit = false): void {
    const raw = this.exprInput?.value || '';

    if (!this.resultEl) return;

    if (!raw.trim()) {
      this.resultEl.textContent = '';
      this.resultEl.classList.remove('error');
      return;
    }

    try {
      const sanitized = this.sanitize(raw);
      // 安全求值（仅数字与运算符，已通过白名单过滤）
      // eslint-disable-next-line no-new-func
      const fn = new Function('return (' + sanitized + ')');
      const val = fn();

      if (typeof val !== 'number' || Number.isNaN(val)) {
        throw new Error('表达式无效');
      }

      const str = this.formatNumber(val);
      this.resultEl.textContent = str;
      this.resultEl.classList.remove('error');

      if (commit) {
        // 成功提交时给结果一个轻微弹跳效果
        this.resultEl.classList.remove('pop');
        void this.resultEl.offsetWidth; // 触发重排以重启动画
        this.resultEl.classList.add('pop');
      }
    } catch {
      // 错误时不显示任何文本，仅保留错误样式
      this.resultEl.textContent = '';
      this.resultEl.classList.add('error');
    }
  }

  private sanitize(raw: string): string {
    let s = String(raw || '').trim();
    if (!s) return s;

    // 将 ^ 替换为 **
    s = s.replace(/\^/g, '**');

    // 白名单字符检查（仅数字与基本运算符）
    if (!/^[0-9+\-*/%^().\s]+$/.test(s)) {
      throw new Error('含非法字符');
    }

    return s;
  }

  private formatNumber(n: number): string {
    if (typeof n !== 'number' || !Number.isFinite(n)) {
      return '无穷/非法';
    }

    // 始终使用普通小数表示，最多保留 12 位小数，并去除尾随 0
    const s = n
      .toFixed(12)
      .replace(/\.0+$/, '')
      .replace(/(\.\d*?)0+$/, '$1');

    return s;
  }
}
