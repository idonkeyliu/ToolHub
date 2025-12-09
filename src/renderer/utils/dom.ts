/**
 * DOM 工具函数
 */

/**
 * 创建元素
 */
export function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options?: {
    className?: string;
    id?: string;
    innerHTML?: string;
    textContent?: string;
    attributes?: Record<string, string>;
    children?: Node[];
  }
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);

  if (options?.className) {
    element.className = options.className;
  }
  if (options?.id) {
    element.id = options.id;
  }
  if (options?.innerHTML) {
    element.innerHTML = options.innerHTML;
  }
  if (options?.textContent) {
    element.textContent = options.textContent;
  }
  if (options?.attributes) {
    Object.entries(options.attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
  }
  if (options?.children) {
    options.children.forEach((child) => element.appendChild(child));
  }

  return element;
}

/**
 * 安全查询元素
 */
export function $(selector: string, parent: Element | Document = document): HTMLElement | null {
  return parent.querySelector(selector);
}

/**
 * 查询所有元素
 */
export function $$(selector: string, parent: Element | Document = document): NodeListOf<HTMLElement> {
  return parent.querySelectorAll(selector);
}
