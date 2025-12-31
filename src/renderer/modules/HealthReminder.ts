/**
 * 健康提醒模块 - 护眼休息提醒
 */

import { i18n } from '../core/i18n';
import { weatherEffects } from './WeatherEffects';

export interface HealthReminderOptions {
  /** 提醒阈值（秒），默认 25 分钟 */
  threshold?: number;
  /** 无活动超时（毫秒），默认 60 秒 */
  activityTimeout?: number;
  /** 休息时长（秒），默认 10 秒 */
  breakDuration?: number;
}

export class HealthReminder {
  private activeTime: number = 0; // 累计活跃时间（秒）
  private activityTimer: ReturnType<typeof setInterval> | null = null;
  private lastActivityTime: number = Date.now();
  private isWindowFocused: boolean = true;
  private isBreakActive: boolean = false;
  private enabled: boolean = false;

  private readonly threshold: number;
  private readonly activityTimeout: number;
  private readonly breakDuration: number;

  constructor(options: HealthReminderOptions = {}) {
    this.threshold = options.threshold ?? 25 * 60; // 25 分钟
    this.activityTimeout = options.activityTimeout ?? 60 * 1000; // 60 秒
    this.breakDuration = options.breakDuration ?? 10; // 10 秒
  }

  /** 初始化健康提醒 */
  init(): void {
    // 检查是否启用健康提醒
    this.enabled = localStorage.getItem('healthReminderEnabled') !== 'false';
    if (!this.enabled) return;

    // 监听用户活动
    const updateActivity = () => {
      this.lastActivityTime = Date.now();
    };

    document.addEventListener('mousemove', updateActivity);
    document.addEventListener('mousedown', updateActivity);
    document.addEventListener('keydown', updateActivity);
    document.addEventListener('scroll', updateActivity, true);
    document.addEventListener('wheel', updateActivity, true);

    // 监听窗口焦点
    window.addEventListener('focus', () => {
      this.isWindowFocused = true;
      this.lastActivityTime = Date.now();
    });

    window.addEventListener('blur', () => {
      this.isWindowFocused = false;
    });

    // 每秒检查一次活动状态
    this.activityTimer = setInterval(() => {
      // 如果正在休息中，不计时
      if (this.isBreakActive) return;

      const now = Date.now();
      const isActive = this.isWindowFocused && (now - this.lastActivityTime < this.activityTimeout);

      if (isActive) {
        this.activeTime++;
        
        // 达到阈值，触发休息提醒
        if (this.activeTime >= this.threshold) {
          this.triggerBreak();
        }
      }
    }, 1000);

    console.log('[HealthReminder] 🏥 Health reminder initialized');
  }

  /** 触发健康休息 */
  private triggerBreak(): void {
    // 检查开关状态
    if (!this.enabled || this.isBreakActive) return;

    this.isBreakActive = true;
    console.log('[HealthReminder] 🏥 Triggering health break!');

    // 随机选择效果
    const effect = weatherEffects.startRandom();

    // 创建休息遮罩
    const overlay = document.createElement('div');
    overlay.id = 'healthBreakOverlay';
    overlay.innerHTML = `
      <div class="health-break-content">
        <div class="health-break-icon">${effect === 'rain' ? '🌧️' : '❄️'}</div>
        <div class="health-break-title">${i18n.t('health.breakTitle')}</div>
        <div class="health-break-desc">${i18n.t('health.breakDesc')}</div>
        <div class="health-break-timer">${this.breakDuration}</div>
        <button class="health-break-skip">${i18n.t('health.skip')}</button>
      </div>
    `;
    document.body.appendChild(overlay);

    // 添加样式
    const style = document.createElement('style');
    style.id = 'healthBreakStyle';
    style.textContent = `
      #healthBreakOverlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.85);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        animation: fadeIn 0.5s ease;
      }
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      .health-break-content {
        text-align: center;
        color: white;
        padding: 40px;
      }
      .health-break-icon {
        font-size: 64px;
        margin-bottom: 20px;
        animation: bounce 1s ease infinite;
      }
      @keyframes bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-10px); }
      }
      .health-break-title {
        font-size: 28px;
        font-weight: 600;
        margin-bottom: 12px;
      }
      .health-break-desc {
        font-size: 16px;
        color: #9ca3af;
        margin-bottom: 30px;
      }
      .health-break-timer {
        font-size: 48px;
        font-weight: 700;
        color: #3b82f6;
        margin-bottom: 20px;
      }
      .health-break-skip {
        padding: 8px 24px;
        background: transparent;
        border: 1px solid #4b5563;
        color: #9ca3af;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s;
      }
      .health-break-skip:hover {
        border-color: #6b7280;
        color: #e5e7eb;
      }
    `;
    document.head.appendChild(style);

    // 倒计时
    let countdown = this.breakDuration;
    const timerEl = overlay.querySelector('.health-break-timer');
    const countdownInterval = setInterval(() => {
      countdown--;
      if (timerEl) timerEl.textContent = String(countdown);
      
      if (countdown <= 0) {
        clearInterval(countdownInterval);
        this.endBreak();
      }
    }, 1000);

    // 跳过按钮
    const skipBtn = overlay.querySelector('.health-break-skip');
    skipBtn?.addEventListener('click', () => {
      clearInterval(countdownInterval);
      this.endBreak();
    });
  }

  /** 结束健康休息 */
  private endBreak(): void {
    // 移除遮罩
    const overlay = document.getElementById('healthBreakOverlay');
    const style = document.getElementById('healthBreakStyle');
    overlay?.remove();
    style?.remove();

    // 停止天气效果
    weatherEffects.stopAll();

    // 重置计时
    this.activeTime = 0;
    this.isBreakActive = false;

    console.log('[HealthReminder] 🏥 Health break ended, timer reset');
  }

  /** 检查是否正在休息中 */
  isInBreak(): boolean {
    return this.isBreakActive;
  }

  /** 销毁健康提醒 */
  destroy(): void {
    if (this.activityTimer) {
      clearInterval(this.activityTimer);
      this.activityTimer = null;
    }
    this.endBreak();
  }
}

// 导出单例
export const healthReminder = new HealthReminder();
