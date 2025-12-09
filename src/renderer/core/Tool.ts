/**
 * 工具基类
 * 所有工具都应该继承此类
 */

import type { ITool, ToolConfig } from '../types/index';

export abstract class Tool implements ITool {
  /** 工具配置 */
  abstract config: ToolConfig;

  /** 根容器 */
  protected container: HTMLElement | null = null;

  /** 是否已挂载 */
  private _mounted = false;

  /** 是否已激活 */
  protected active = false;

  /** 获取挂载状态 */
  get mounted(): boolean {
    return this._mounted;
  }

  /** 事件监听器清理函数 */
  protected cleanupFns: Array<() => void> = [];

  /**
   * 渲染工具UI
   * 子类必须实现此方法
   */
  abstract render(): HTMLElement;

  /**
   * 挂载到指定容器
   */
  mount(container: HTMLElement): void {
    if (this.mounted) {
      console.warn(`[${this.config.key}] Tool already mounted`);
      return;
    }

    this.container = container;
    const element = this.render();

    // 添加工具特定的类名和数据属性
    element.classList.add('tool-view', `${this.config.key}-view`);
    element.dataset.key = this.config.key;

    container.appendChild(element);
    this._mounted = true;

    // 绑定事件
    this.bindEvents();

    // 触发挂载后的钩子
    this.onMounted();
  }

  /**
   * 卸载工具
   */
  unmount(): void {
    if (!this.mounted || !this.container) {
      return;
    }

    // 失活工具
    if (this.active) {
      this.deactivate();
    }

    // 清理事件监听器
    this.cleanupEvents();

    // 触发卸载前的钩子
    this.onBeforeUnmount();

    // 移除DOM
    const element = this.container.querySelector(`.${this.config.key}-view`);
    if (element) {
      element.remove();
    }

    this.container = null;
    this._mounted = false;
  }

  /**
   * 激活工具
   */
  activate(): void {
    if (this.active) {
      return;
    }

    if (!this.mounted) {
      console.error(`[${this.config.key}] Cannot activate unmounted tool`);
      return;
    }

    const element = this.container?.querySelector(`.${this.config.key}-view`) as HTMLElement;
    if (element) {
      element.classList.add('active');
      // 清除可能存在的行内 display 样式，让 CSS 类生效
      element.style.display = '';
    }

    this.active = true;
    this.onActivated();
  }

  /**
   * 失活工具
   */
  deactivate(): void {
    if (!this.active) {
      return;
    }

    const element = this.container?.querySelector(`.${this.config.key}-view`) as HTMLElement;
    if (element) {
      element.classList.remove('active');
      element.style.display = 'none';
    }

    this.active = false;
    this.onDeactivated();
  }

  /**
   * 销毁工具
   */
  destroy(): void {
    if (this.mounted) {
      this.unmount();
    }
    this.onDestroy();
  }

  // ==================== 生命周期钩子 ====================

  protected onMounted(): void {}
  protected onBeforeUnmount(): void {}
  protected onActivated(): void {}
  protected onDeactivated(): void {}
  protected onDestroy(): void {}

  // ==================== 事件管理 ====================

  protected bindEvents(): void {}

  protected cleanupEvents(): void {
    this.cleanupFns.forEach((cleanup) => cleanup());
    this.cleanupFns = [];
  }

  /**
   * 添加事件监听器（会自动清理）
   */
  protected addEventListener<K extends keyof HTMLElementEventMap>(
    element: HTMLElement | null,
    type: K,
    listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions
  ): void {
    if (!element) return;

    element.addEventListener(type, listener, options);

    this.cleanupFns.push(() => {
      element.removeEventListener(type, listener, options);
    });
  }

  /**
   * 查询元素（限定在工具容器内）
   */
  protected querySelector<E extends HTMLElement = HTMLElement>(selector: string): E | null {
    if (!this.container) return null;
    const element = this.container.querySelector(`.${this.config.key}-view`);
    return element?.querySelector<E>(selector) || null;
  }

  /**
   * 查询所有元素
   */
  protected querySelectorAll<E extends HTMLElement = HTMLElement>(selector: string): NodeListOf<E> {
    if (!this.container) return document.querySelectorAll<E>('');
    const element = this.container.querySelector(`.${this.config.key}-view`);
    return element?.querySelectorAll<E>(selector) || document.querySelectorAll<E>('');
  }
}
