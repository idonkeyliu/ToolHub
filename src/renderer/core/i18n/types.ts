/**
 * 国际化类型定义
 */

// 支持的语言类型
export type Language = 'zh' | 'en';

// 翻译字典类型
export interface Translations {
    [key: string]: string;
}

// 语言名称配置
export interface LanguageInfo {
    native: string;
    english: string;
}
