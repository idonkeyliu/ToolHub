/**
 * 国际化模块 - 管理多语言支持
 * 支持扩展：可轻松添加日语(ja)、印地语(hi)等语言
 */
import { Language, Translations, LanguageInfo } from './types';
import { zhCN, enUS } from './locales';

export type { Language, Translations, LanguageInfo };

// ============== 语言配置映射 ==============
const translations: Record<Language, Translations> = {
  zh: zhCN,
  en: enUS,
};

// 语言显示名称配置
export const languageNames: Record<Language, LanguageInfo> = {
  zh: { native: '简体中文', english: 'Simplified Chinese' },
  en: { native: 'English', english: 'English' },
};

// 获取所有支持的语言列表
export const supportedLanguages: Language[] = Object.keys(translations) as Language[];

const STORAGE_KEY = 'toolhub-language';

class I18n {
  private language: Language;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.language = this.loadLanguage();
  }

  private loadLanguage(): Language {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && supportedLanguages.includes(saved as Language)) {
      return saved as Language;
    }
    return 'en'; // 默认英文
  }

  getLanguage(): Language {
    return this.language;
  }

  setLanguage(lang: Language): void {
    if (lang !== this.language && supportedLanguages.includes(lang)) {
      this.language = lang;
      localStorage.setItem(STORAGE_KEY, lang);
      this.notify();
    }
  }

  /**
   * 获取翻译文本
   * @param key 翻译键
   * @param fallback 回退文本（可选）
   * @param params 替换参数（可选），如 {year: 2024} 会替换 {year}
   */
  t(key: string, fallback?: string, params?: Record<string, string | number>): string {
    const trans = translations[this.language];
    // 使用 in 检查键是否存在，而不是检查值是否为 truthy，以支持空字符串
    let text = key in trans ? trans[key] : (fallback !== undefined ? fallback : key);
    
    // 支持参数替换，如 i18n.t('calendar.lunarYear', '', {year: 2024})
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      });
    }
    
    return text;
  }

  // 获取目录的翻译名称
  getCategoryTitle(id: string, defaultTitle: string): string {
    const key = `category.${id}`;
    return this.t(key, defaultTitle);
  }

  // 获取工具的翻译名称
  getToolTitle(key: string, defaultTitle: string): string {
    const transKey = `tool.${key}`;
    return this.t(transKey, defaultTitle);
  }

  // 订阅语言变化
  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  // 初始化页面翻译（页面加载后调用）
  initPageTranslations(): void {
    this.notify();
    // 初始化设置面板标题
    const settingsTabTitle = document.getElementById('settingsTabTitle');
    if (settingsTabTitle) {
      settingsTabTitle.textContent = this.t('settings.general');
    }
  }

  private notify(): void {
    // 更新所有带 data-i18n 属性的元素
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (key) {
        el.textContent = this.t(key);
      }
    });
    // 更新带 data-i18n-placeholder 属性的输入框
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (key && (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) {
        el.placeholder = this.t(key);
      }
    });
    // 更新带 data-i18n-title 属性的元素
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      if (key && el instanceof HTMLElement) {
        el.title = this.t(key);
      }
    });
    // 通知所有监听器
    this.listeners.forEach(fn => fn());
  }
}

export const i18n = new I18n();
