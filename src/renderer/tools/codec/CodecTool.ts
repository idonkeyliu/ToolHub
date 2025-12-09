/**
 * 编解码工具
 */

import { Tool } from '../../core/Tool';
import type { ToolConfig } from '../../types/index';
import { ToolCategory } from '../../types/index';
import { createElement } from '../../utils/dom';
import { codecTemplate } from './template';

declare function toast(msg: string): void;
declare function copyText(text: string): void;

export class CodecTool extends Tool {
  static readonly config: ToolConfig = {
    key: 'codec',
    title: '编解码',
    category: ToolCategory.CONVERTER,
    icon: '🔄',
    description: 'URL/Base64/Unicode/Hex/HTML 编解码工具',
    keywords: ['codec', '编码', '解码', 'url', 'base64', 'unicode', 'hex', 'html'],
  };

  config = CodecTool.config;

  render(): HTMLElement {
    return createElement('div', {
      className: 'codec-view',
      innerHTML: codecTemplate,
    });
  }

  protected bindEvents(): void {
    this.setupTabs();
    this.setupUrlCodec();
    this.setupBase64Codec();
    this.setupUnicodeCodec();
    this.setupHexCodec();
    this.setupHtmlCodec();
  }

  protected onActivated(): void {
    setTimeout(() => {
      const firstInput = this.querySelector<HTMLTextAreaElement>('#urlDecoded');
      firstInput?.focus();
    }, 100);
  }

  private setupTabs(): void {
    const tabs = this.querySelectorAll<HTMLElement>('.codec-tab');
    const panels = this.querySelectorAll<HTMLElement>('.codec-panel');

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

  // URL 编解码
  private setupUrlCodec(): void {
    const decoded = this.querySelector<HTMLTextAreaElement>('#urlDecoded');
    const encoded = this.querySelector<HTMLTextAreaElement>('#urlEncoded');
    const error = this.querySelector<HTMLElement>('#urlError');

    const encodeBtn = this.querySelector<HTMLElement>('#urlEncode');
    const decodeBtn = this.querySelector<HTMLElement>('#urlDecode');
    const clearBtn = this.querySelector<HTMLElement>('#urlClear');
    const copyBtn = this.querySelector<HTMLElement>('#urlCopy');

    if (encodeBtn) {
      this.addEventListener(encodeBtn, 'click', () => {
        try {
          if (encoded && decoded) encoded.value = encodeURIComponent(decoded.value);
          if (error) error.style.display = 'none';
        } catch (e: any) {
          if (error) {
            error.textContent = '编码失败：' + e.message;
            error.style.display = 'block';
          }
        }
      });
    }

    if (decodeBtn) {
      this.addEventListener(decodeBtn, 'click', () => {
        try {
          if (decoded && encoded) decoded.value = decodeURIComponent(encoded.value);
          if (error) error.style.display = 'none';
        } catch (e: any) {
          if (error) {
            error.textContent = '解码失败：' + e.message;
            error.style.display = 'block';
          }
        }
      });
    }

    if (clearBtn) {
      this.addEventListener(clearBtn, 'click', () => {
        if (decoded) decoded.value = '';
        if (encoded) encoded.value = '';
        if (error) error.style.display = 'none';
      });
    }

    if (copyBtn) {
      this.addEventListener(copyBtn, 'click', () => {
        const text = encoded?.value || decoded?.value || '';
        if (text) copyText(text);
        else toast('无内容可复制');
      });
    }
  }

  // Base64 编解码
  private setupBase64Codec(): void {
    const decoded = this.querySelector<HTMLTextAreaElement>('#base64Decoded');
    const encoded = this.querySelector<HTMLTextAreaElement>('#base64Encoded');
    const error = this.querySelector<HTMLElement>('#base64Error');

    const encodeBtn = this.querySelector<HTMLElement>('#base64Encode');
    const decodeBtn = this.querySelector<HTMLElement>('#base64Decode');
    const clearBtn = this.querySelector<HTMLElement>('#base64Clear');
    const copyBtn = this.querySelector<HTMLElement>('#base64Copy');

    if (encodeBtn) {
      this.addEventListener(encodeBtn, 'click', () => {
        try {
          if (encoded && decoded) {
            // 支持中文的 Base64 编码
            const bytes = new TextEncoder().encode(decoded.value);
            let binary = '';
            bytes.forEach(b => binary += String.fromCharCode(b));
            encoded.value = btoa(binary);
          }
          if (error) error.style.display = 'none';
        } catch (e: any) {
          if (error) {
            error.textContent = '编码失败：' + e.message;
            error.style.display = 'block';
          }
        }
      });
    }

    if (decodeBtn) {
      this.addEventListener(decodeBtn, 'click', () => {
        try {
          if (decoded && encoded) {
            // 支持中文的 Base64 解码
            const binary = atob(encoded.value);
            const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
            decoded.value = new TextDecoder().decode(bytes);
          }
          if (error) error.style.display = 'none';
        } catch (e: any) {
          if (error) {
            error.textContent = '解码失败：' + e.message;
            error.style.display = 'block';
          }
        }
      });
    }

    if (clearBtn) {
      this.addEventListener(clearBtn, 'click', () => {
        if (decoded) decoded.value = '';
        if (encoded) encoded.value = '';
        if (error) error.style.display = 'none';
      });
    }

    if (copyBtn) {
      this.addEventListener(copyBtn, 'click', () => {
        const text = encoded?.value || decoded?.value || '';
        if (text) copyText(text);
        else toast('无内容可复制');
      });
    }
  }

  // Unicode 编解码
  private setupUnicodeCodec(): void {
    const decoded = this.querySelector<HTMLTextAreaElement>('#unicodeDecoded');
    const encoded = this.querySelector<HTMLTextAreaElement>('#unicodeEncoded');
    const error = this.querySelector<HTMLElement>('#unicodeError');

    const encodeBtn = this.querySelector<HTMLElement>('#unicodeEncode');
    const decodeBtn = this.querySelector<HTMLElement>('#unicodeDecode');
    const clearBtn = this.querySelector<HTMLElement>('#unicodeClear');
    const copyBtn = this.querySelector<HTMLElement>('#unicodeCopy');

    if (encodeBtn) {
      this.addEventListener(encodeBtn, 'click', () => {
        try {
          if (encoded && decoded) {
            let result = '';
            for (let i = 0; i < decoded.value.length; i++) {
              const code = decoded.value.charCodeAt(i);
              result += '\\u' + code.toString(16).padStart(4, '0');
            }
            encoded.value = result;
          }
          if (error) error.style.display = 'none';
        } catch (e: any) {
          if (error) {
            error.textContent = '编码失败：' + e.message;
            error.style.display = 'block';
          }
        }
      });
    }

    if (decodeBtn) {
      this.addEventListener(decodeBtn, 'click', () => {
        try {
          if (decoded && encoded) {
            const result = encoded.value.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => {
              return String.fromCharCode(parseInt(hex, 16));
            });
            decoded.value = result;
          }
          if (error) error.style.display = 'none';
        } catch (e: any) {
          if (error) {
            error.textContent = '解码失败：' + e.message;
            error.style.display = 'block';
          }
        }
      });
    }

    if (clearBtn) {
      this.addEventListener(clearBtn, 'click', () => {
        if (decoded) decoded.value = '';
        if (encoded) encoded.value = '';
        if (error) error.style.display = 'none';
      });
    }

    if (copyBtn) {
      this.addEventListener(copyBtn, 'click', () => {
        const text = encoded?.value || decoded?.value || '';
        if (text) copyText(text);
        else toast('无内容可复制');
      });
    }
  }

  // Hex 编解码
  private setupHexCodec(): void {
    const decoded = this.querySelector<HTMLTextAreaElement>('#hexDecoded');
    const encoded = this.querySelector<HTMLTextAreaElement>('#hexEncoded');
    const error = this.querySelector<HTMLElement>('#hexError');

    const encodeBtn = this.querySelector<HTMLElement>('#hexEncode');
    const decodeBtn = this.querySelector<HTMLElement>('#hexDecode');
    const clearBtn = this.querySelector<HTMLElement>('#hexClear');
    const copyBtn = this.querySelector<HTMLElement>('#hexCopy');

    if (encodeBtn) {
      this.addEventListener(encodeBtn, 'click', () => {
        try {
          if (encoded && decoded) {
            const bytes = new TextEncoder().encode(decoded.value);
            let hex = '';
            bytes.forEach(b => hex += b.toString(16).padStart(2, '0'));
            encoded.value = hex;
          }
          if (error) error.style.display = 'none';
        } catch (e: any) {
          if (error) {
            error.textContent = '编码失败：' + e.message;
            error.style.display = 'block';
          }
        }
      });
    }

    if (decodeBtn) {
      this.addEventListener(decodeBtn, 'click', () => {
        try {
          if (decoded && encoded) {
            const hex = encoded.value.replace(/\s/g, '');
            if (hex.length % 2 !== 0) throw new Error('Hex 长度必须为偶数');
            const bytes = new Uint8Array(hex.length / 2);
            for (let i = 0; i < hex.length; i += 2) {
              bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
            }
            decoded.value = new TextDecoder().decode(bytes);
          }
          if (error) error.style.display = 'none';
        } catch (e: any) {
          if (error) {
            error.textContent = '解码失败：' + e.message;
            error.style.display = 'block';
          }
        }
      });
    }

    if (clearBtn) {
      this.addEventListener(clearBtn, 'click', () => {
        if (decoded) decoded.value = '';
        if (encoded) encoded.value = '';
        if (error) error.style.display = 'none';
      });
    }

    if (copyBtn) {
      this.addEventListener(copyBtn, 'click', () => {
        const text = encoded?.value || decoded?.value || '';
        if (text) copyText(text);
        else toast('无内容可复制');
      });
    }
  }

  // HTML 实体编解码
  private setupHtmlCodec(): void {
    const decoded = this.querySelector<HTMLTextAreaElement>('#htmlDecoded');
    const encoded = this.querySelector<HTMLTextAreaElement>('#htmlEncoded');
    const error = this.querySelector<HTMLElement>('#htmlError');

    const encodeBtn = this.querySelector<HTMLElement>('#htmlEncode');
    const decodeBtn = this.querySelector<HTMLElement>('#htmlDecode');
    const clearBtn = this.querySelector<HTMLElement>('#htmlClear');
    const copyBtn = this.querySelector<HTMLElement>('#htmlCopy');

    const htmlEntities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
      '/': '&#x2F;',
      '`': '&#x60;',
      '=': '&#x3D;'
    };

    if (encodeBtn) {
      this.addEventListener(encodeBtn, 'click', () => {
        try {
          if (encoded && decoded) {
            encoded.value = decoded.value.replace(/[&<>"'`=\/]/g, char => htmlEntities[char]);
          }
          if (error) error.style.display = 'none';
        } catch (e: any) {
          if (error) {
            error.textContent = '编码失败：' + e.message;
            error.style.display = 'block';
          }
        }
      });
    }

    if (decodeBtn) {
      this.addEventListener(decodeBtn, 'click', () => {
        try {
          if (decoded && encoded) {
            const textarea = document.createElement('textarea');
            textarea.innerHTML = encoded.value;
            decoded.value = textarea.value;
          }
          if (error) error.style.display = 'none';
        } catch (e: any) {
          if (error) {
            error.textContent = '解码失败：' + e.message;
            error.style.display = 'block';
          }
        }
      });
    }

    if (clearBtn) {
      this.addEventListener(clearBtn, 'click', () => {
        if (decoded) decoded.value = '';
        if (encoded) encoded.value = '';
        if (error) error.style.display = 'none';
      });
    }

    if (copyBtn) {
      this.addEventListener(copyBtn, 'click', () => {
        const text = encoded?.value || decoded?.value || '';
        if (text) copyText(text);
        else toast('无内容可复制');
      });
    }
  }
}
