/**
 * 时间戳工具
 */

import { Tool } from '../../core/Tool';
import type { ToolConfig } from '../../types/index';
import { ToolCategory, EventType } from '../../types/index';
import { createElement } from '../../utils/dom';
import { copyText } from '../../utils/clipboard';
import { eventBus } from '../../core/EventBus';
import { getTemplate } from './template';
import { i18n } from '../../core/i18n';

export class TimestampTool extends Tool {
  static readonly config: ToolConfig = {
    key: 'time',
    title: i18n.t('tool.timestamp'),
    category: ToolCategory.UTILITY,
    icon: '⏰',
    description: i18n.t('tool.timestampDesc'),
    keywords: ['timestamp', 'unix', 'date', 'time'],
  };

  config = TimestampTool.config;

  private updateTimer: number | null = null;

  render(): HTMLElement {
    const container = createElement('div', {
      className: 'time-wrap',
      innerHTML: getTemplate(new Date()),
    });
    return container;
  }

  protected bindEvents(): void {
    this.bindCopyButtons();
    this.bindTimestampConverter();
    this.bindDateTimeConverter();
  }

  protected onActivated(): void {
    this.startTimer();
  }

  protected onDeactivated(): void {
    this.stopTimer();
  }

  protected onDestroy(): void {
    this.stopTimer();
  }

  // ==================== 私有方法 ====================

  private bindCopyButtons(): void {
    const buttons = this.querySelectorAll<HTMLButtonElement>('.stamp-card-copy, .convert-card-copy');
    buttons.forEach((btn) => {
      this.addEventListener(btn, 'click', () => {
        const targetId = btn.dataset.target;
        if (targetId) {
          const target = this.querySelector<HTMLElement>(`#${targetId}`);
          if (target) {
            const text = target.textContent || '';
            copyText(text).then(() => {
              eventBus.emit(EventType.TOAST_SHOW, { message: i18n.t('timestamp.copied'), duration: 1300 });
            });
          }
        } else if (btn.id === 'tsCopyBtn') {
          const output = this.querySelector<HTMLElement>('#tsConvOut');
          if (output?.textContent) {
            copyText(output.textContent).then(() => {
              eventBus.emit(EventType.TOAST_SHOW, { message: i18n.t('timestamp.copied'), duration: 1300 });
            });
          }
        } else if (btn.id === 'dtCopyBtn') {
          const output = this.querySelector<HTMLElement>('#dtConvOut');
          if (output?.textContent) {
            copyText(output.textContent).then(() => {
              eventBus.emit(EventType.TOAST_SHOW, { message: i18n.t('timestamp.copied'), duration: 1300 });
            });
          }
        }
      });
    });
  }

  private bindTimestampConverter(): void {
    const input = this.querySelector<HTMLInputElement>('#tsInput');
    const output = this.querySelector<HTMLElement>('#tsConvOut');

    if (!input || !output) return;

    const convert = () => {
      const val = input.value.trim();
      if (!val) {
        output.textContent = '';
        return;
      }

      let num = Number(val);
      if (isNaN(num)) {
        output.textContent = i18n.t('timestamp.invalidNumber');
        output.style.color = '#ef4444';
        return;
      }

      // 判断是秒还是毫秒
      if (val.length <= 10) num = num * 1000;
      const date = new Date(num);

      if (isNaN(date.getTime())) {
        output.textContent = i18n.t('timestamp.invalidTimestamp');
        output.style.color = '#ef4444';
        return;
      }

      output.textContent = this.formatDateTime(date);
      output.style.color = '#10b981';
    };

    this.addEventListener(input, 'input', convert);
  }

  private bindDateTimeConverter(): void {
    const yInput = this.querySelector<HTMLInputElement>('#dtY');
    const mInput = this.querySelector<HTMLInputElement>('#dtM');
    const dInput = this.querySelector<HTMLInputElement>('#dtD');
    const hInput = this.querySelector<HTMLInputElement>('#dtH');
    const minInput = this.querySelector<HTMLInputElement>('#dtMin');
    const sInput = this.querySelector<HTMLInputElement>('#dtS');
    const output = this.querySelector<HTMLElement>('#dtConvOut');

    if (!output) return;

    const convert = () => {
      const y = parseInt(yInput?.value || '') || 0;
      const m = parseInt(mInput?.value || '') || 1;
      const d = parseInt(dInput?.value || '') || 1;
      const h = parseInt(hInput?.value || '') || 0;
      const min = parseInt(minInput?.value || '') || 0;
      const s = parseInt(sInput?.value || '') || 0;

      if (!yInput?.value) {
        output.textContent = '';
        return;
      }

      const date = new Date(y, m - 1, d, h, min, s);
      if (isNaN(date.getTime())) {
        output.textContent = i18n.t('timestamp.invalidDate');
        output.style.color = '#ef4444';
        return;
      }

      const sec = Math.floor(date.getTime() / 1000);
      output.textContent = String(sec);
      output.style.color = '#10b981';
    };

    [yInput, mInput, dInput, hInput, minInput, sInput].forEach((input) => {
      if (input) this.addEventListener(input, 'input', convert);
    });
  }

  private startTimer(): void {
    this.updateTime();
    this.updateTimer = window.setInterval(() => {
      this.updateTime();
    }, 1000);
  }

  private stopTimer(): void {
    if (this.updateTimer !== null) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
  }

  private updateTime(): void {
    const now = new Date();

    // 更新大时钟
    const year = this.querySelector('.year');
    const month = this.querySelector('.month');
    const day = this.querySelector('.day');
    const hour = this.querySelector('.hour');
    const minute = this.querySelector('.minute');
    const second = this.querySelector('.second');

    if (year) year.textContent = String(now.getFullYear());
    if (month) month.textContent = this.padZero(now.getMonth() + 1);
    if (day) day.textContent = this.padZero(now.getDate());
    if (hour) hour.textContent = this.padZero(now.getHours());
    if (minute) minute.textContent = this.padZero(now.getMinutes());
    if (second) second.textContent = this.padZero(now.getSeconds());

    // 更新时间戳
    const sec = Math.floor(now.getTime() / 1000);
    const ms = now.getTime();

    const secEl = this.querySelector('#unixSecVal');
    const msEl = this.querySelector('#unixMsVal');

    if (secEl) secEl.textContent = String(sec);
    if (msEl) msEl.textContent = String(ms);
  }

  private padZero(num: number): string {
    return num < 10 ? `0${num}` : String(num);
  }

  private formatDateTime(date: Date): string {
    const y = date.getFullYear();
    const M = this.padZero(date.getMonth() + 1);
    const d = this.padZero(date.getDate());
    const h = this.padZero(date.getHours());
    const m = this.padZero(date.getMinutes());
    const s = this.padZero(date.getSeconds());
    return `${y}-${M}-${d} ${h}:${m}:${s}`;
  }
}
