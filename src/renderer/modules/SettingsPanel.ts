/**
 * 设置面板模块
 */

import { i18n } from '../core/i18n';
import { themeManager } from '../core/ThemeManager';
import { toast } from '../components/Toast';
import type { Sidebar } from '../components/Sidebar';

export class SettingsPanel {
  private sidebar: Sidebar | null = null;

  constructor() {}

  /** 设置侧边栏引用（用于刷新） */
  setSidebar(sidebar: Sidebar): void {
    this.sidebar = sidebar;
  }

  /** 初始化设置面板事件 */
  init(): void {
    const settingsModal = document.getElementById('settingsModal');
    const settingsClose = document.getElementById('settingsClose');
    const settingsNav = settingsModal?.querySelectorAll('.settings-nav-item');

    if (!settingsModal || !settingsClose) return;

    settingsClose.addEventListener('click', () => {
      settingsModal.classList.remove('show');
    });

    settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal) {
        settingsModal.classList.remove('show');
      }
    });

    // 导航切换
    settingsNav?.forEach(nav => {
      nav.addEventListener('click', () => {
        const tab = nav.getAttribute('data-tab');
        if (tab) {
          settingsNav.forEach(n => n.classList.remove('active'));
          nav.classList.add('active');
          this.renderTab(tab);
        }
      });
    });
  }

  /** 打开设置面板 */
  open(): void {
    const settingsModal = document.getElementById('settingsModal');
    if (settingsModal) {
      // 默认显示通用标签
      const navItems = settingsModal.querySelectorAll('.settings-nav-item');
      navItems.forEach(n => n.classList.remove('active'));
      navItems[0]?.classList.add('active');
      this.renderTab('general');
      settingsModal.classList.add('show');
    }
  }

  /** 关闭设置面板 */
  close(): void {
    const settingsModal = document.getElementById('settingsModal');
    settingsModal?.classList.remove('show');
  }

  /** 渲染设置标签页 */
  renderTab(tab: string): void {
    const container = document.getElementById('settingsBody');
    const titleEl = document.getElementById('settingsTabTitle');
    if (!container) return;

    const tabTitles: Record<string, string> = {
      general: i18n.t('settings.general'),
      theme: i18n.t('settings.theme'),
      fun: i18n.t('settings.fun'),
      about: i18n.t('about.title')
    };

    if (titleEl) {
      titleEl.textContent = tabTitles[tab] || tab;
    }

    if (tab === 'general') {
      this.renderGeneralTab(container);
    } else if (tab === 'theme') {
      this.renderThemeTab(container, tabTitles);
    } else if (tab === 'fun') {
      this.renderFunTab(container);
    } else if (tab === 'about') {
      this.renderAboutTab(container);
    }
  }

  private renderGeneralTab(container: HTMLElement): void {
    const currentLang = i18n.getLanguage();
    
    container.innerHTML = `
      <div class="settings-section">
        <div class="settings-section-header">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="2" y1="12" x2="22" y2="12"></line>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
          </svg>
          <span>${i18n.t('settings.language')}</span>
        </div>
        <div class="settings-section-body">
          <div class="settings-select-group">
            <div class="settings-select-option ${currentLang === 'zh' ? 'active' : ''}" data-lang="zh">
              <div class="settings-select-icon">🇨🇳</div>
              <div class="settings-select-info">
                <div class="settings-select-title">${i18n.t('lang.zh')}</div>
                <div class="settings-select-desc">${i18n.t('lang.zhDesc')}</div>
              </div>
              <div class="settings-select-check">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" width="16" height="16">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
            </div>
            <div class="settings-select-option ${currentLang === 'en' ? 'active' : ''}" data-lang="en">
              <div class="settings-select-icon">🇺🇸</div>
              <div class="settings-select-info">
                <div class="settings-select-title">${i18n.t('lang.en')}</div>
                <div class="settings-select-desc">${i18n.t('lang.enDesc')}</div>
              </div>
              <div class="settings-select-check">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" width="16" height="16">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // 语言选择事件
    container.querySelectorAll('.settings-select-option').forEach(option => {
      option.addEventListener('click', () => {
        const lang = option.getAttribute('data-lang') as 'zh' | 'en';
        if (lang) {
          i18n.setLanguage(lang);
          container.querySelectorAll('.settings-select-option').forEach(o => o.classList.remove('active'));
          option.classList.add('active');
          toast({ message: i18n.t(lang === 'zh' ? 'lang.switchedToZh' : 'lang.switchedToEn'), duration: 1500 });
          // 刷新整个页面以应用语言变更
          setTimeout(() => {
            this.sidebar?.render();
            this.renderTab('general');
          }, 100);
        }
      });
    });
  }

  private renderThemeTab(container: HTMLElement, tabTitles: Record<string, string>): void {
    const currentTheme = themeManager.getTheme();
    container.innerHTML = `
      <div class="settings-section-title">${i18n.t('settings.theme')}</div>
      <div class="theme-options">
        <div class="theme-option ${currentTheme === 'dark' ? 'active' : ''}" data-theme="dark">
          <div class="theme-option-radio"></div>
          <span>${i18n.t('settings.themeDark')}</span>
        </div>
        <div class="theme-option ${currentTheme === 'light' ? 'active' : ''}" data-theme="light">
          <div class="theme-option-radio"></div>
          <span>${i18n.t('settings.themeLight')}</span>
        </div>
        <div class="theme-option ${currentTheme === 'system' ? 'active' : ''}" data-theme="system">
          <div class="theme-option-radio"></div>
          <span>${i18n.t('settings.themeSystem')}</span>
        </div>
      </div>
    `;

    container.querySelectorAll('.theme-option').forEach(option => {
      option.addEventListener('click', () => {
        const theme = option.getAttribute('data-theme') as 'dark' | 'light' | 'system';
        if (theme) {
          themeManager.setTheme(theme);
          container.querySelectorAll('.theme-option').forEach(o => o.classList.remove('active'));
          option.classList.add('active');
          toast({ message: `已切换到${tabTitles[theme] || theme}主题`, duration: 1500 });
        }
      });
    });
  }

  private renderFunTab(container: HTMLElement): void {
    const carEnabled = localStorage.getItem('funCarEnabled') !== 'false';
    const healthEnabled = localStorage.getItem('healthReminderEnabled') !== 'false';

    container.innerHTML = `
      <div class="settings-section">
        <div class="settings-section-header">
          <svg viewBox="0 0 32 16" width="24" height="12" fill="none" stroke="currentColor" stroke-width="1.2">
            <rect x="2" y="8" width="28" height="5" rx="1" fill="currentColor" stroke="none"/>
            <path d="M8 8V5a1 1 0 0 1 1-1h6l3-2h3l2 3h1v3" fill="currentColor" stroke="none"/>
            <circle cx="9" cy="13" r="2.5" fill="var(--bg-primary)" stroke="currentColor" stroke-width="1"/>
            <circle cx="23" cy="13" r="2.5" fill="var(--bg-primary)" stroke="currentColor" stroke-width="1"/>
          </svg>
          <span>${i18n.t('settings.funCar')}</span>
        </div>
        <div class="settings-section-body">
          <div class="settings-toggle-item">
            <div class="settings-toggle-info">
              <div class="settings-toggle-desc">${i18n.t('settings.funCarDesc')}</div>
            </div>
            <div class="settings-toggle ${carEnabled ? 'active' : ''}" id="funCarToggle">
              <div class="settings-toggle-knob"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-header">
          <span style="font-size: 18px;">👀</span>
          <span>${i18n.t('settings.healthReminder')}</span>
        </div>
        <div class="settings-section-body">
          <div class="settings-toggle-item">
            <div class="settings-toggle-info">
              <div class="settings-toggle-desc">${i18n.t('settings.healthReminderDesc')}</div>
            </div>
            <div class="settings-toggle ${healthEnabled ? 'active' : ''}" id="healthReminderToggle">
              <div class="settings-toggle-knob"></div>
            </div>
          </div>
        </div>
      </div>
    `;

    // 绑定小车开关事件
    const toggle = document.getElementById('funCarToggle');
    toggle?.addEventListener('click', () => {
      const isActive = toggle.classList.toggle('active');
      localStorage.setItem('funCarEnabled', isActive ? 'true' : 'false');
      const car = document.getElementById('movingCar');
      if (car) {
        car.style.display = isActive ? 'block' : 'none';
      }
      toast({ message: isActive ? '小车已启动 🚗' : '小车已停止', duration: 1500 });
    });

    // 绑定健康提醒开关事件
    const healthToggle = document.getElementById('healthReminderToggle');
    healthToggle?.addEventListener('click', () => {
      const isActive = healthToggle.classList.toggle('active');
      localStorage.setItem('healthReminderEnabled', isActive ? 'true' : 'false');
      toast({ message: i18n.t(isActive ? 'settings.healthReminderOn' : 'settings.healthReminderOff'), duration: 1500 });
      // 提示需要刷新
      if (isActive) {
        toast({ message: i18n.t('settings.healthReminderRefresh'), duration: 3000 });
      }
    });
  }

  private renderAboutTab(container: HTMLElement): void {
    container.innerHTML = `
      <div class="about-content">
        <div class="about-logo">
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="aboutLogoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#00d4ff;stop-opacity:1" />
                <stop offset="50%" style="stop-color:#7c3aed;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#f472b6;stop-opacity:1" />
              </linearGradient>
              <filter id="aboutLogoGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur"/>
                <feMerge>
                  <feMergeNode in="blur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            <rect x="8" y="8" width="64" height="64" rx="16" fill="url(#aboutLogoGradient)" filter="url(#aboutLogoGlow)" opacity="0.15"/>
            <rect x="12" y="12" width="56" height="56" rx="14" stroke="url(#aboutLogoGradient)" stroke-width="2" fill="none"/>
            <!-- Wrench -->
            <path d="M28 52L38 42M38 42L42 38M42 38L52 28" stroke="url(#aboutLogoGradient)" stroke-width="4" stroke-linecap="round"/>
            <circle cx="25" cy="55" r="6" stroke="url(#aboutLogoGradient)" stroke-width="3" fill="none"/>
            <circle cx="55" cy="25" r="6" stroke="url(#aboutLogoGradient)" stroke-width="3" fill="none"/>
            <!-- Gear teeth -->
            <path d="M55 19V17M55 33V31M61 25H63M47 25H49M59.2 20.8L60.6 19.4M49.4 30.6L50.8 29.2M59.2 29.2L60.6 30.6M49.4 19.4L50.8 20.8" stroke="url(#aboutLogoGradient)" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </div>
        <div class="about-name">ToolHub Pro</div>
        <div class="about-version">v1.0.0</div>
        <div class="about-desc">${i18n.t('about.description')}</div>
        <div class="about-slogan">${i18n.t('about.slogan')}</div>
      </div>
    `;
  }
}

// 导出单例
export const settingsPanel = new SettingsPanel();
