/**
 * 主题管理器
 * 支持深色/浅色主题切换
 */

import { getStorage, setStorage } from '../utils/storage';

export type Theme = 'dark' | 'light' | 'system';

const STORAGE_KEY = 'theme';

class ThemeManager {
  private currentTheme: Theme = 'dark';
  private mediaQuery: MediaQueryList | null = null;

  constructor() {
    this.init();
  }

  private init(): void {
    // 从存储加载主题
    this.currentTheme = getStorage<Theme>(STORAGE_KEY, 'dark');

    // 监听系统主题变化
    this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.mediaQuery.addEventListener('change', () => {
      if (this.currentTheme === 'system') {
        this.applyTheme();
      }
    });

    // 应用主题
    this.applyTheme();
  }

  /**
   * 获取当前主题
   */
  getTheme(): Theme {
    return this.currentTheme;
  }

  /**
   * 获取实际应用的主题（解析 system）
   */
  getResolvedTheme(): 'dark' | 'light' {
    if (this.currentTheme === 'system') {
      return this.mediaQuery?.matches ? 'dark' : 'light';
    }
    return this.currentTheme;
  }

  /**
   * 设置主题
   */
  setTheme(theme: Theme): void {
    this.currentTheme = theme;
    setStorage(STORAGE_KEY, theme);
    this.applyTheme();
  }

  /**
   * 切换主题
   */
  toggle(): void {
    const resolved = this.getResolvedTheme();
    this.setTheme(resolved === 'dark' ? 'light' : 'dark');
  }

  /**
   * 应用主题到 DOM
   */
  private applyTheme(): void {
    const resolved = this.getResolvedTheme();
    document.documentElement.setAttribute('data-theme', resolved);
    document.body.classList.remove('theme-dark', 'theme-light');
    document.body.classList.add(`theme-${resolved}`);

    // 更新 meta theme-color
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.setAttribute('name', 'theme-color');
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.setAttribute('content', resolved === 'dark' ? '#0d1114' : '#f5f5f5');
  }
}

export const themeManager = new ThemeManager();
