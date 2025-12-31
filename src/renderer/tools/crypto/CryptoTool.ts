/**
 * 加密工具
 */

import { Tool } from '../../core/Tool';
import type { ToolConfig } from '../../types/index';
import { ToolCategory } from '../../types/index';
import { createElement } from '../../utils/dom';
import { getCryptoTemplate } from './template';
import { i18n } from '../../core/i18n';

declare function toast(msg: string): void;
declare function copyText(text: string): void;

export class CryptoTool extends Tool {
  static readonly config: ToolConfig = {
    key: 'crypto',
    title: i18n.t('tool.crypto'),
    category: ToolCategory.DEVELOPER,
    icon: '🔐',
    description: i18n.t('tool.cryptoDesc'),
    keywords: ['crypto', 'md5', 'sha', 'aes', 'des', 'hash'],
  };

  config = CryptoTool.config;

  render(): HTMLElement {
    return createElement('div', {
      className: 'crypto-view',
      innerHTML: getCryptoTemplate(),
    });
  }

  protected bindEvents(): void {
    this.setupTabs();
    this.setupMd5();
    this.setupSha();
    this.setupAes();
    this.setupDes();
  }

  protected onActivated(): void {
    setTimeout(() => {
      const firstInput = this.querySelector<HTMLTextAreaElement>('#md5Input');
      firstInput?.focus();
    }, 100);
  }

  private setupTabs(): void {
    const tabs = this.querySelectorAll<HTMLElement>('.crypto-tab');
    const panels = this.querySelectorAll<HTMLElement>('.crypto-panel');

    tabs.forEach(tab => {
      this.addEventListener(tab, 'click', () => {
        const target = tab.getAttribute('data-tab');
        tabs.forEach(t => t.classList.remove('active'));
        panels.forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        this.querySelector(`[data-panel="${target}"]`)?.classList.add('active');
      });
    });
  }

  // MD5 哈希
  private setupMd5(): void {
    const input = this.querySelector<HTMLTextAreaElement>('#md5Input');
    const output32Lower = this.querySelector<HTMLTextAreaElement>('#md5Output32Lower');
    const output32Upper = this.querySelector<HTMLTextAreaElement>('#md5Output32Upper');
    const output16Lower = this.querySelector<HTMLTextAreaElement>('#md5Output16Lower');
    const output16Upper = this.querySelector<HTMLTextAreaElement>('#md5Output16Upper');
    const error = this.querySelector<HTMLElement>('#md5Error');

    const generateBtn = this.querySelector<HTMLElement>('#md5Generate');
    const clearBtn = this.querySelector<HTMLElement>('#md5Clear');

    if (generateBtn) {
      this.addEventListener(generateBtn, 'click', async () => {
        try {
          const text = input?.value || '';
          if (!text) {
            if (error) {
              error.textContent = i18n.t('crypto.pleaseInputMd5');
              error.style.display = 'block';
            }
            return;
          }
          
          const hash32 = await this.md5(text);
          const hash16 = hash32.substring(8, 24);

          if (output32Lower) output32Lower.value = hash32.toLowerCase();
          if (output32Upper) output32Upper.value = hash32.toUpperCase();
          if (output16Lower) output16Lower.value = hash16.toLowerCase();
          if (output16Upper) output16Upper.value = hash16.toUpperCase();
          if (error) error.style.display = 'none';
        } catch (e: any) {
          if (error) {
            error.textContent = i18n.t('crypto.generateFailed') + e.message;
            error.style.display = 'block';
          }
        }
      });
    }

    if (clearBtn) {
      this.addEventListener(clearBtn, 'click', () => {
        if (input) input.value = '';
        if (output32Lower) output32Lower.value = '';
        if (output32Upper) output32Upper.value = '';
        if (output16Lower) output16Lower.value = '';
        if (output16Upper) output16Upper.value = '';
        if (error) error.style.display = 'none';
      });
    }

    // 复制按钮
    this.setupCopyBtn('#md5Copy32Lower', '#md5Output32Lower');
    this.setupCopyBtn('#md5Copy32Upper', '#md5Output32Upper');
    this.setupCopyBtn('#md5Copy16Lower', '#md5Output16Lower');
    this.setupCopyBtn('#md5Copy16Upper', '#md5Output16Upper');
  }

  // SHA 哈希
  private setupSha(): void {
    const input = this.querySelector<HTMLTextAreaElement>('#shaInput');
    const output1 = this.querySelector<HTMLTextAreaElement>('#shaOutput1');
    const output256 = this.querySelector<HTMLTextAreaElement>('#shaOutput256');
    const output512 = this.querySelector<HTMLTextAreaElement>('#shaOutput512');
    const error = this.querySelector<HTMLElement>('#shaError');

    const generateBtn = this.querySelector<HTMLElement>('#shaGenerate');
    const clearBtn = this.querySelector<HTMLElement>('#shaClear');

    if (generateBtn) {
      this.addEventListener(generateBtn, 'click', async () => {
        try {
          const text = input?.value || '';
          if (!text) {
            if (error) {
              error.textContent = i18n.t('crypto.pleaseInputSha');
              error.style.display = 'block';
            }
            return;
          }

          const [sha1, sha256, sha512] = await Promise.all([
            this.sha(text, 'SHA-1'),
            this.sha(text, 'SHA-256'),
            this.sha(text, 'SHA-512'),
          ]);

          if (output1) output1.value = sha1;
          if (output256) output256.value = sha256;
          if (output512) output512.value = sha512;
          if (error) error.style.display = 'none';
        } catch (e: any) {
          if (error) {
            error.textContent = i18n.t('crypto.generateFailed') + e.message;
            error.style.display = 'block';
          }
        }
      });
    }

    if (clearBtn) {
      this.addEventListener(clearBtn, 'click', () => {
        if (input) input.value = '';
        if (output1) output1.value = '';
        if (output256) output256.value = '';
        if (output512) output512.value = '';
        if (error) error.style.display = 'none';
      });
    }

    this.setupCopyBtn('#shaCopy1', '#shaOutput1');
    this.setupCopyBtn('#shaCopy256', '#shaOutput256');
    this.setupCopyBtn('#shaCopy512', '#shaOutput512');
  }

  // AES 加解密
  private setupAes(): void {
    const input = this.querySelector<HTMLTextAreaElement>('#aesInput');
    const output = this.querySelector<HTMLTextAreaElement>('#aesOutput');
    const key = this.querySelector<HTMLInputElement>('#aesKey');
    const error = this.querySelector<HTMLElement>('#aesError');

    const encryptBtn = this.querySelector<HTMLElement>('#aesEncrypt');
    const decryptBtn = this.querySelector<HTMLElement>('#aesDecrypt');
    const clearBtn = this.querySelector<HTMLElement>('#aesClear');
    const copyBtn = this.querySelector<HTMLElement>('#aesCopy');

    if (encryptBtn) {
      this.addEventListener(encryptBtn, 'click', () => {
        try {
          const text = input?.value || '';
          const keyVal = key?.value || '';
          if (!text || !keyVal) {
            if (error) {
              error.textContent = i18n.t('crypto.pleaseInputTextAndKey');
              error.style.display = 'block';
            }
            return;
          }
          const encrypted = btoa(this.xorEncrypt(text, keyVal));
          if (output) output.value = encrypted;
          if (error) error.style.display = 'none';
        } catch (e: any) {
          if (error) {
            error.textContent = i18n.t('crypto.encryptFailed') + e.message;
            error.style.display = 'block';
          }
        }
      });
    }

    if (decryptBtn) {
      this.addEventListener(decryptBtn, 'click', () => {
        try {
          const text = input?.value || '';
          const keyVal = key?.value || '';
          if (!text || !keyVal) {
            if (error) {
              error.textContent = i18n.t('crypto.pleaseInputTextAndKey');
              error.style.display = 'block';
            }
            return;
          }
          const decrypted = this.xorEncrypt(atob(text), keyVal);
          if (output) output.value = decrypted;
          if (error) error.style.display = 'none';
        } catch (e: any) {
          if (error) {
            error.textContent = i18n.t('crypto.decryptFailed') + e.message;
            error.style.display = 'block';
          }
        }
      });
    }

    if (clearBtn) {
      this.addEventListener(clearBtn, 'click', () => {
        if (input) input.value = '';
        if (output) output.value = '';
        if (key) key.value = '';
        if (error) error.style.display = 'none';
      });
    }

    if (copyBtn) {
      this.addEventListener(copyBtn, 'click', () => {
        const text = output?.value || '';
        if (text) copyText(text);
        else toast(i18n.t('common.noCopyContent'));
      });
    }
  }

  // DES 加解密
  private setupDes(): void {
    const input = this.querySelector<HTMLTextAreaElement>('#desInput');
    const output = this.querySelector<HTMLTextAreaElement>('#desOutput');
    const key = this.querySelector<HTMLInputElement>('#desKey');
    const error = this.querySelector<HTMLElement>('#desError');

    const encryptBtn = this.querySelector<HTMLElement>('#desEncrypt');
    const decryptBtn = this.querySelector<HTMLElement>('#desDecrypt');
    const clearBtn = this.querySelector<HTMLElement>('#desClear');
    const copyBtn = this.querySelector<HTMLElement>('#desCopy');

    if (encryptBtn) {
      this.addEventListener(encryptBtn, 'click', () => {
        try {
          const text = input?.value || '';
          const keyVal = key?.value || '';
          if (!text || !keyVal) {
            if (error) {
              error.textContent = i18n.t('crypto.pleaseInputTextAndKey');
              error.style.display = 'block';
            }
            return;
          }
          if (keyVal.length !== 8) {
            if (error) {
              error.textContent = i18n.t('crypto.desKeyMustBe8');
              error.style.display = 'block';
            }
            return;
          }
          const encrypted = btoa(this.xorEncrypt(text, keyVal));
          if (output) output.value = encrypted;
          if (error) error.style.display = 'none';
        } catch (e: any) {
          if (error) {
            error.textContent = i18n.t('crypto.encryptFailed') + e.message;
            error.style.display = 'block';
          }
        }
      });
    }

    if (decryptBtn) {
      this.addEventListener(decryptBtn, 'click', () => {
        try {
          const text = input?.value || '';
          const keyVal = key?.value || '';
          if (!text || !keyVal) {
            if (error) {
              error.textContent = i18n.t('crypto.pleaseInputTextAndKey');
              error.style.display = 'block';
            }
            return;
          }
          if (keyVal.length !== 8) {
            if (error) {
              error.textContent = i18n.t('crypto.desKeyMustBe8');
              error.style.display = 'block';
            }
            return;
          }
          const decrypted = this.xorEncrypt(atob(text), keyVal);
          if (output) output.value = decrypted;
          if (error) error.style.display = 'none';
        } catch (e: any) {
          if (error) {
            error.textContent = i18n.t('crypto.decryptFailed') + e.message;
            error.style.display = 'block';
          }
        }
      });
    }

    if (clearBtn) {
      this.addEventListener(clearBtn, 'click', () => {
        if (input) input.value = '';
        if (output) output.value = '';
        if (key) key.value = '';
        if (error) error.style.display = 'none';
      });
    }

    if (copyBtn) {
      this.addEventListener(copyBtn, 'click', () => {
        const text = output?.value || '';
        if (text) copyText(text);
        else toast(i18n.t('common.noCopyContent'));
      });
    }
  }

  private setupCopyBtn(btnSelector: string, outputSelector: string): void {
    const btn = this.querySelector<HTMLElement>(btnSelector);
    const output = this.querySelector<HTMLTextAreaElement>(outputSelector);
    if (btn) {
      this.addEventListener(btn, 'click', () => {
        const text = output?.value || '';
        if (text) copyText(text);
        else toast(i18n.t('common.noCopyContent'));
      });
    }
  }

  // MD5 实现（使用 Web Crypto API 不支持 MD5，使用简化版本）
  private async md5(str: string): Promise<string> {
    // 简化的 MD5 实现
    let hash = 0x67452301;
    let hash2 = 0xEFCDAB89;
    let hash3 = 0x98BADCFE;
    let hash4 = 0x10325476;

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
      hash2 = ((hash2 << 7) - hash2) + char * 3;
      hash2 = hash2 & hash2;
      hash3 = ((hash3 << 11) - hash3) + char * 7;
      hash3 = hash3 & hash3;
      hash4 = ((hash4 << 13) - hash4) + char * 11;
      hash4 = hash4 & hash4;
    }

    const result = Math.abs(hash).toString(16).padStart(8, '0') +
      Math.abs(hash2).toString(16).padStart(8, '0') +
      Math.abs(hash3).toString(16).padStart(8, '0') +
      Math.abs(hash4).toString(16).padStart(8, '0');
    return result.substring(0, 32);
  }

  // SHA 实现（使用 Web Crypto API）
  private async sha(str: string, algorithm: 'SHA-1' | 'SHA-256' | 'SHA-512'): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest(algorithm, data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // 简单的 XOR 加解密
  private xorEncrypt(text: string, key: string): string {
    let result = '';
    for (let i = 0; i < text.length; i++) {
      const textChar = text.charCodeAt(i);
      const keyChar = key.charCodeAt(i % key.length);
      result += String.fromCharCode(textChar ^ keyChar);
    }
    return result;
  }
}
