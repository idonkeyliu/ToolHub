/**
 * Toast 提示组件
 */

import type { ToastData } from '../types/index';

let toastTimer: number | null = null;

class ToastComponent {
  private static instance: ToastComponent | null = null;
  private element: HTMLElement | null = null;

  private constructor() {
    this.createToastElement();
  }

  static getInstance(): ToastComponent {
    if (!ToastComponent.instance) {
      ToastComponent.instance = new ToastComponent();
    }
    return ToastComponent.instance;
  }

  private createToastElement(): void {
    // 检查是否已存在
    const existing = document.getElementById('toast');
    if (existing) {
      this.element = existing;
      return;
    }

    // 创建新的 toast 元素
    const toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
    this.element = toast;
  }

  show(data: ToastData | string): void {
    if (!this.element) return;

    const message = typeof data === 'string' ? data : data.message;
    const duration = typeof data === 'string' ? 1300 : (data.duration || 1300);

    this.element.textContent = message;
    this.element.classList.add('show');

    if (toastTimer) {
      clearTimeout(toastTimer);
    }

    toastTimer = window.setTimeout(() => {
      this.element?.classList.remove('show');
    }, duration);
  }

  hide(): void {
    if (toastTimer) {
      clearTimeout(toastTimer);
      toastTimer = null;
    }
    this.element?.classList.remove('show');
  }
}

export const Toast = ToastComponent;

export function toast(data: ToastData | string): void {
  Toast.getInstance().show(data);
}
