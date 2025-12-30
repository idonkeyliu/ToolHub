/**
 * 国际化模块 - 管理多语言支持
 */

export type Language = 'zh' | 'en';

interface Translations {
  [key: string]: string;
}

const zhCN: Translations = {
  // 通用
  'common.confirm': '确定',
  'common.cancel': '取消',
  'common.save': '保存',
  'common.delete': '删除',
  'common.edit': '编辑',
  'common.add': '添加',
  'common.reset': '重置',
  'common.search': '搜索',
  'common.close': '关闭',

  // 侧边栏
  'sidebar.favorites': '收藏',
  'sidebar.tools': '工具',
  'sidebar.settings': '设置',
  'sidebar.about': '关于',
  'sidebar.stats': '统计',
  'sidebar.addCategory': '添加目录',
  'sidebar.addSite': '添加网站',

  // 目录
  'category.overseas-llm': '海外大模型',
  'category.domestic-llm': '国内大模型',
  'category.dev': '编程开发',
  'category.community': '社区',
  'category.design': '设计',
  'category.email': '邮件',
  'category.video': '视频',
  'category.utility': '实用工具',
  'category.encoding': '编解码工具',
  'category.format': '格式化工具',
  'category.storage': '存储工具',
  'category.network': '网络工具',
  'category.terminal': '终端工具',

  // 设置
  'settings.title': '设置',
  'settings.general': '通用',
  'settings.theme': '主题',
  'settings.language': '语言设置',
  'settings.languageDesc': '选择界面显示语言',
  'settings.dataManagement': '数据管理',
  'settings.resetData': '重置目录和工具分配',
  'settings.resetDataDesc': '清除所有自定义目录和工具配置，恢复默认设置',
  'settings.resetConfirm': '确定要重置所有目录和工具分配吗？自定义网站将被删除。',
  'settings.resetSuccess': '已重置',
  'settings.themeSystem': '跟随系统',
  'settings.themeLight': '浅色',
  'settings.themeDark': '深色',
  'settings.fun': '趣味',
  'settings.funCar': '小车动画',
  'settings.funCarDesc': '在底部显示一辆来回移动的小车',

  // 语言
  'lang.zh': '简体中文',
  'lang.zhDesc': 'Simplified Chinese',
  'lang.en': 'English',
  'lang.enDesc': '英文',
  'lang.switchedToZh': '已切换到中文',
  'lang.switchedToEn': 'Switched to English',

  // 关于
  'about.title': '关于',
  'about.version': '版本',
  'about.description': '一站式开发者工具箱',

  // 添加对话框
  'dialog.addSite': '添加网站',
  'dialog.addCategory': '添加目录',
  'dialog.siteName': '网站名称',
  'dialog.siteUrl': '网站地址',
  'dialog.siteIcon': '图标文字',
  'dialog.siteColor': '图标颜色',
  'dialog.categoryName': '目录名称',
  'dialog.categoryIcon': '目录图标',

  // 命令面板
  'command.placeholder': '搜索工具或网站...',
  'command.noResults': '无匹配结果',

  // 工具名称
  'tool.time': '时间戳',
  'tool.pwd': '密码生成',
  'tool.text': '文本统计',
  'tool.calc': '计算器',
  'tool.json': 'JSON 格式化',
  'tool.codec': '编解码',
  'tool.crypto': '加密解密',
  'tool.dns': 'DNS 查询',
  'tool.curl': 'HTTP 请求',
  'tool.color': '颜色转换',
  'tool.calendar': '日历',
  'tool.currency': '汇率转换',
  'tool.image': '图片工具',
  'tool.database': '数据库',
  'tool.redis': 'Redis',
  'tool.mongo': 'MongoDB',
  'tool.diff': '文本对比',
  'tool.jwt': 'JWT 解析',
  'tool.regex': '正则测试',
  'tool.terminal': '终端',
  'tool.sync': '数据同步',
};

const enUS: Translations = {
  // Common
  'common.confirm': 'Confirm',
  'common.cancel': 'Cancel',
  'common.save': 'Save',
  'common.delete': 'Delete',
  'common.edit': 'Edit',
  'common.add': 'Add',
  'common.reset': 'Reset',
  'common.search': 'Search',
  'common.close': 'Close',

  // Sidebar
  'sidebar.favorites': 'Favorites',
  'sidebar.tools': 'Tools',
  'sidebar.settings': 'Settings',
  'sidebar.about': 'About',
  'sidebar.stats': 'Statistics',
  'sidebar.addCategory': 'Add Category',
  'sidebar.addSite': 'Add Website',

  // Categories
  'category.overseas-llm': 'Overseas LLM',
  'category.domestic-llm': 'Domestic LLM',
  'category.dev': 'Development',
  'category.community': 'Community',
  'category.design': 'Design',
  'category.email': 'Email',
  'category.video': 'Video',
  'category.utility': 'Utilities',
  'category.encoding': 'Encoding Tools',
  'category.format': 'Formatting Tools',
  'category.storage': 'Storage Tools',
  'category.network': 'Network Tools',
  'category.terminal': 'Terminal Tools',

  // Settings
  'settings.title': 'Settings',
  'settings.general': 'General',
  'settings.theme': 'Theme',
  'settings.language': 'Language',
  'settings.languageDesc': 'Select interface language',
  'settings.dataManagement': 'Data Management',
  'settings.resetData': 'Reset Categories & Tools',
  'settings.resetDataDesc': 'Clear all custom categories and tool configurations, restore defaults',
  'settings.resetConfirm': 'Are you sure you want to reset all categories and tool assignments? Custom websites will be deleted.',
  'settings.resetSuccess': 'Reset complete',
  'settings.themeSystem': 'System',
  'settings.themeLight': 'Light',
  'settings.themeDark': 'Dark',
  'settings.fun': 'Fun',
  'settings.funCar': 'Car Animation',
  'settings.funCarDesc': 'Show a moving car at the bottom',

  // Language
  'lang.zh': 'Simplified Chinese',
  'lang.zhDesc': '简体中文',
  'lang.en': 'English',
  'lang.enDesc': 'English',
  'lang.switchedToZh': '已切换到中文',
  'lang.switchedToEn': 'Switched to English',

  // About
  'about.title': 'About',
  'about.version': 'Version',
  'about.description': 'All-in-one Developer Toolbox',

  // Add Dialog
  'dialog.addSite': 'Add Website',
  'dialog.addCategory': 'Add Category',
  'dialog.siteName': 'Website Name',
  'dialog.siteUrl': 'Website URL',
  'dialog.siteIcon': 'Icon Text',
  'dialog.siteColor': 'Icon Color',
  'dialog.categoryName': 'Category Name',
  'dialog.categoryIcon': 'Category Icon',

  // Command Palette
  'command.placeholder': 'Search tools or websites...',
  'command.noResults': 'No results found',

  // Tool names
  'tool.time': 'Timestamp',
  'tool.pwd': 'Password Generator',
  'tool.text': 'Text Statistics',
  'tool.calc': 'Calculator',
  'tool.json': 'JSON Formatter',
  'tool.codec': 'Encoder/Decoder',
  'tool.crypto': 'Encryption',
  'tool.dns': 'DNS Lookup',
  'tool.curl': 'HTTP Request',
  'tool.color': 'Color Converter',
  'tool.calendar': 'Calendar',
  'tool.currency': 'Currency Converter',
  'tool.image': 'Image Tools',
  'tool.database': 'Database',
  'tool.redis': 'Redis',
  'tool.mongo': 'MongoDB',
  'tool.diff': 'Text Diff',
  'tool.jwt': 'JWT Parser',
  'tool.regex': 'Regex Tester',
  'tool.terminal': 'Terminal',
  'tool.sync': 'Data Sync',
};

const translations: Record<Language, Translations> = {
  zh: zhCN,
  en: enUS,
};

const STORAGE_KEY = 'toolhub-language';

class I18n {
  private language: Language;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.language = this.loadLanguage();
  }

  private loadLanguage(): Language {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'zh' || saved === 'en') {
      return saved;
    }
    return 'zh'; // 默认中文
  }

  getLanguage(): Language {
    return this.language;
  }

  setLanguage(lang: Language): void {
    if (lang !== this.language) {
      this.language = lang;
      localStorage.setItem(STORAGE_KEY, lang);
      this.notify();
    }
  }

  t(key: string, fallback?: string): string {
    const trans = translations[this.language];
    return trans[key] || fallback || key;
  }

  // 获取目录的翻译名称
  getCategoryTitle(id: string, defaultTitle: string): string {
    const key = `category.${id}`;
    const trans = translations[this.language];
    return trans[key] || defaultTitle;
  }

  // 获取工具的翻译名称
  getToolTitle(key: string, defaultTitle: string): string {
    const transKey = `tool.${key}`;
    const trans = translations[this.language];
    return trans[transKey] || defaultTitle;
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify(): void {
    this.listeners.forEach(fn => fn());
  }
}

export const i18n = new I18n();
