/**
 * 文本统计工具
 */

import { Tool } from '../../core/Tool';
import type { ToolConfig } from '../../types/index';
import { ToolCategory } from '../../types/index';
import { createElement } from '../../utils/dom';
import { template } from './template';
import './styles.css';

export class TextStatsTool extends Tool {
  static readonly config: ToolConfig = {
    key: 'text',
    title: '文本统计',
    category: ToolCategory.UTILITY,
    icon: '📝',
    description: '实时统计文本字符数、行数、单词数等',
    keywords: ['文本', 'text', '统计', '字数', '字符', 'count'],
  };

  config = TextStatsTool.config;

  private textInput: HTMLTextAreaElement | null = null;
  private vChars: HTMLElement | null = null;
  private vCharsNoSpace: HTMLElement | null = null;
  private vLines: HTMLElement | null = null;
  private vWords: HTMLElement | null = null;
  private vChinese: HTMLElement | null = null;
  private vEnglish: HTMLElement | null = null;
  private vDigits: HTMLElement | null = null;
  private vParagraphs: HTMLElement | null = null;

  render(): HTMLElement {
    return createElement('div', {
      className: 'text-view',
      innerHTML: template(),
    });
  }

  protected bindEvents(): void {
    this.textInput = this.querySelector<HTMLTextAreaElement>('#textInput');
    this.vChars = this.querySelector<HTMLElement>('#vChars');
    this.vCharsNoSpace = this.querySelector<HTMLElement>('#vCharsNoSpace');
    this.vLines = this.querySelector<HTMLElement>('#vLines');
    this.vWords = this.querySelector<HTMLElement>('#vWords');
    this.vChinese = this.querySelector<HTMLElement>('#vChinese');
    this.vEnglish = this.querySelector<HTMLElement>('#vEnglish');
    this.vDigits = this.querySelector<HTMLElement>('#vDigits');
    this.vParagraphs = this.querySelector<HTMLElement>('#vParagraphs');

    if (this.textInput) {
      this.addEventListener(this.textInput, 'input', () => this.calculate());
    }
  }

  protected onActivated(): void {
    this.calculate();
    // 自动聚焦输入框
    setTimeout(() => this.textInput?.focus(), 100);
  }

  private calculate(): void {
    const val = this.textInput?.value || '';

    // 字符数（含空白）
    const chars = val.length;

    // 字符数（不含空白）
    const charsNoSpace = val.replace(/[\s]/g, '').length;

    // 行数
    const lines = val ? val.split(/\r?\n/).length : 0;

    // 单词数（英文单词 + 中文字符）
    const words = (val.trim().match(/[^\s]+/g) || []).length;

    // 中文字符数
    const chinese = (val.match(/[\u4e00-\u9fa5]/g) || []).length;

    // 英文字母数
    const english = (val.match(/[a-zA-Z]/g) || []).length;

    // 数字数
    const digits = (val.match(/\d/g) || []).length;

    // 段落数（以空行分隔）
    const paragraphs = val.trim()
      ? val.split(/\n\s*\n/).filter((p) => p.trim()).length
      : 0;

    // 更新显示
    this.updateValue(this.vChars, chars);
    this.updateValue(this.vCharsNoSpace, charsNoSpace);
    this.updateValue(this.vLines, lines);
    this.updateValue(this.vWords, words);
    this.updateValue(this.vChinese, chinese);
    this.updateValue(this.vEnglish, english);
    this.updateValue(this.vDigits, digits);
    this.updateValue(this.vParagraphs, paragraphs);
  }

  private updateValue(el: HTMLElement | null, value: number): void {
    if (!el) return;
    const oldValue = parseInt(el.textContent || '0', 10);
    if (oldValue !== value) {
      el.textContent = String(value);
      // 添加动画效果
      el.style.transform = 'scale(1.1)';
      el.style.transition = 'transform 0.15s ease';
      setTimeout(() => {
        el.style.transform = 'scale(1)';
      }, 150);
    }
  }
}
