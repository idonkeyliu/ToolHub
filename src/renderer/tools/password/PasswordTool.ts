/**
 * 密码生成工具
 */

import { Tool } from '../../core/Tool';
import type { ToolConfig } from '../../types/index';
import { ToolCategory, EventType } from '../../types/index';
import { createElement } from '../../utils/dom';
import { copyText } from '../../utils/clipboard';
import { eventBus } from '../../core/EventBus';
import { template } from './template';
import './styles.css';

export class PasswordTool extends Tool {
  static readonly config: ToolConfig = {
    key: 'pwd',
    title: '密码生成',
    category: ToolCategory.UTILITY,
    icon: '🔐',
    description: '安全随机密码生成器',
    keywords: ['密码', 'password'],
  };

  config = PasswordTool.config;
  private outputEl: HTMLInputElement | null = null;
  private genBtn: HTMLButtonElement | null = null;
  private copyBtn: HTMLButtonElement | null = null;
  private lenSlider: HTMLInputElement | null = null;
  private lenNum: HTMLInputElement | null = null;
  private lenVal: HTMLElement | null = null;
  private meterBar: HTMLElement | null = null;
  private strengthTxt: HTMLElement | null = null;
  private optLower: HTMLInputElement | null = null;
  private optUpper: HTMLInputElement | null = null;
  private optDigits: HTMLInputElement | null = null;
  private optSymbols: HTMLInputElement | null = null;

  render(): HTMLElement {
    return createElement('div', { className: 'pwd-view', innerHTML: template() });
  }

  protected bindEvents(): void {
    this.outputEl = this.querySelector<HTMLInputElement>('#pwdOut');
    this.genBtn = this.querySelector<HTMLButtonElement>('#pwdGen');
    this.copyBtn = this.querySelector<HTMLButtonElement>('#pwdCopy');
    this.lenSlider = this.querySelector<HTMLInputElement>('#pwdLen');
    this.lenNum = this.querySelector<HTMLInputElement>('#pwdLenNum');
    this.lenVal = this.querySelector<HTMLElement>('#pwdLenVal');
    this.meterBar = this.querySelector<HTMLElement>('#pwdMeterBar');
    this.strengthTxt = this.querySelector<HTMLElement>('#pwdStrength');
    this.optLower = this.querySelector<HTMLInputElement>('#optLower');
    this.optUpper = this.querySelector<HTMLInputElement>('#optUpper');
    this.optDigits = this.querySelector<HTMLInputElement>('#optDigits');
    this.optSymbols = this.querySelector<HTMLInputElement>('#optSymbols');

    if (this.genBtn) this.addEventListener(this.genBtn, 'click', () => this.generateAndDisplay());
    if (this.copyBtn) this.addEventListener(this.copyBtn, 'click', () => this.handleCopy());
    if (this.lenSlider) this.addEventListener(this.lenSlider, 'input', () => { this.updateLengthDisplay(); this.generateAndDisplay(); });
    if (this.lenNum) this.addEventListener(this.lenNum, 'input', () => {
      const v = this.clampLength(this.lenNum!.value);
      if (this.lenSlider && String(v) !== String(this.lenSlider.value)) {
        this.lenSlider.value = String(v); this.updateLengthDisplay(); this.generateAndDisplay();
      }
    });
    [this.optLower, this.optUpper, this.optDigits, this.optSymbols].forEach(el => {
      if (el) this.addEventListener(el, 'change', () => this.generateAndDisplay());
    });
  }

  protected onActivated(): void { this.updateLengthDisplay(); this.generateAndDisplay(); }

  private clampLength(v: string): number { return Math.max(8, Math.min(64, Math.floor(Number(v) || 16))); }

  private updateLengthDisplay(): void {
    if (this.lenVal && this.lenSlider) this.lenVal.textContent = this.lenSlider.value;
    if (this.lenNum && this.lenSlider) this.lenNum.value = this.lenSlider.value;
  }

  private getCharacterPool(): string {
    let pool = '';
    if (this.optLower?.checked) pool += 'abcdefghijklmnopqrstuvwxyz';
    if (this.optUpper?.checked) pool += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (this.optDigits?.checked) pool += '0123456789';
    if (this.optSymbols?.checked) pool += '!@#$%^&*_-+=?';
    return pool;
  }

  private generatePassword(): string {
    const length = Number(this.lenSlider?.value || 16);
    const pool = this.getCharacterPool();
    if (!pool) return '';
    let password = '';
    const cryptoObj = window.crypto || (window as any).msCrypto;
    if (cryptoObj && cryptoObj.getRandomValues) {
      const arr = new Uint32Array(length);
      cryptoObj.getRandomValues(arr);
      for (let i = 0; i < length; i++) password += pool[arr[i] % pool.length];
    } else {
      for (let i = 0; i < length; i++) password += pool[Math.floor(Math.random() * pool.length)];
    }
    return password;
  }

  private estimateStrength(password: string): number {
    const charset = new Set(password.split('')).size;
    const length = password.length;
    const bits = length > 0 && charset > 1 ? Math.log2(Math.pow(charset, length)) : 0;
    return Math.max(0, Math.min(100, Math.floor(bits / 1.5)));
  }

  private updateStrengthMeter(password: string): void {
    const pct = this.estimateStrength(password);
    if (this.meterBar) {
      this.meterBar.style.width = pct + '%';
      if (pct < 35) {
        this.meterBar.style.background = 'linear-gradient(90deg, #ef4444, #ff6b6b)';
        this.meterBar.style.boxShadow = '0 0 15px rgba(239, 68, 68, 0.6)';
      } else if (pct < 70) {
        this.meterBar.style.background = 'linear-gradient(90deg, #f59e0b, #fbbf24)';
        this.meterBar.style.boxShadow = '0 0 15px rgba(245, 158, 11, 0.6)';
      } else {
        this.meterBar.style.background = 'linear-gradient(90deg, #22c55e, #4ade80)';
        this.meterBar.style.boxShadow = '0 0 15px rgba(34, 197, 94, 0.6)';
      }
    }
    if (this.strengthTxt) {
      if (pct < 35) { this.strengthTxt.textContent = '🔴 弱'; this.strengthTxt.style.color = '#ef4444'; }
      else if (pct < 70) { this.strengthTxt.textContent = '🟡 中'; this.strengthTxt.style.color = '#f59e0b'; }
      else { this.strengthTxt.textContent = '🟢 强'; this.strengthTxt.style.color = '#22c55e'; }
    }
  }

  private generateAndDisplay(): void {
    const password = this.generatePassword();
    if (this.outputEl) {
      this.outputEl.value = '';
      this.outputEl.style.animation = 'none';
      setTimeout(() => {
        if (this.outputEl) {
          this.outputEl.style.animation = 'pulse 0.5s ease-in-out';
          this.typePassword(password);
        }
      }, 50);
    }
    this.updateStrengthMeter(password);
  }

  private typePassword(password: string): void {
    if (!this.outputEl) return;
    let i = 0;
    const typeInterval = setInterval(() => {
      if (i < password.length && this.outputEl) {
        this.outputEl.value += password[i];
        i++;
      } else {
        clearInterval(typeInterval);
        if (this.outputEl) {
          this.outputEl.style.animation = 'glow 0.8s ease-in-out';
          setTimeout(() => { if (this.outputEl) this.outputEl.style.animation = ''; }, 800);
        }
      }
    }, 30);
  }

  private handleCopy(): void {
    if (!this.outputEl?.value || !this.copyBtn) return;
    copyText(this.outputEl.value).then(() => {
      eventBus.emit(EventType.TOAST_SHOW, { message: '已复制', duration: 1300 });
      if (this.copyBtn) {
        this.copyBtn.style.animation = 'pulse 0.3s ease-in-out';
        this.copyBtn.textContent = '✅ 已复制';
        setTimeout(() => {
          if (this.copyBtn) { this.copyBtn.textContent = '📋 复制'; this.copyBtn.style.animation = ''; }
        }, 1500);
      }
    });
  }
}
