/**
 * JWT 解析器工具
 * 支持解码、验证 JWT Token
 */

import { Tool } from '../../core/Tool';
import { ToolConfig, ToolCategory } from '../../types/index';
import { template } from './template';

declare function toast(msg: string): void;

interface JwtHeader {
  alg: string;
  typ?: string;
  kid?: string;
  [key: string]: any;
}

interface JwtPayload {
  iss?: string;
  sub?: string;
  aud?: string | string[];
  exp?: number;
  nbf?: number;
  iat?: number;
  jti?: string;
  [key: string]: any;
}

interface DecodedJwt {
  header: JwtHeader;
  payload: JwtPayload;
  signature: string;
  raw: {
    header: string;
    payload: string;
    signature: string;
  };
}

const STANDARD_CLAIMS = ['iss', 'sub', 'aud', 'exp', 'nbf', 'iat', 'jti'];

const SAMPLE_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMiwiZXhwIjoxNzM1Njg5NjAwfQ.4S5J5xzK8v9qZ3Yz3K8v9qZ3Yz3K8v9qZ3Yz3K8v9qY';

export class JwtTool extends Tool {
  static readonly config: ToolConfig = {
    key: 'jwt',
    title: 'JWT',
    category: ToolCategory.DEVELOPER,
    icon: '🔑',
    description: 'JWT Token 解析器',
    keywords: ['jwt', 'token', 'json web token', '解析', 'decode', 'verify', '验证'],
  };

  readonly config = JwtTool.config;

  private decoded: DecodedJwt | null = null;

  render(): HTMLElement {
    const container = document.createElement('div');
    container.innerHTML = template;
    return container.firstElementChild as HTMLElement;
  }

  protected onMounted(): void {
    this.updateClaimsHighlight([]);
  }

  protected bindEvents(): void {
    const jwtInput = this.querySelector('#jwtInput') as HTMLTextAreaElement;

    // 输入监听
    if (jwtInput) {
      this.addEventListener(jwtInput, 'input', () => this.parseJwt());
      this.addEventListener(jwtInput, 'paste', () => {
        setTimeout(() => this.parseJwt(), 0);
      });
    }

    // 工具栏按钮
    this.addEventListener(this.querySelector('#pasteBtn'), 'click', () => this.pasteFromClipboard());
    this.addEventListener(this.querySelector('#sampleBtn'), 'click', () => this.loadSample());
    this.addEventListener(this.querySelector('#clearBtn'), 'click', () => this.clear());

    // 复制按钮
    this.addEventListener(this.querySelector('#copyHeaderBtn'), 'click', () => this.copyPart('header'));
    this.addEventListener(this.querySelector('#copyPayloadBtn'), 'click', () => this.copyPart('payload'));
    this.addEventListener(this.querySelector('#copySignatureBtn'), 'click', () => this.copyPart('signature'));

    // 验证开关
    this.addEventListener(this.querySelector('#verifyToggle'), 'change', (e) => {
      const checked = (e.target as HTMLInputElement).checked;
      const verifyContent = this.querySelector('#verifyContent');
      if (verifyContent) {
        verifyContent.style.display = checked ? 'block' : 'none';
      }
    });

    // 验证按钮
    this.addEventListener(this.querySelector('#verifyBtn'), 'click', () => this.verifySignature());
  }

  private parseJwt(): void {
    const jwtInput = this.querySelector('#jwtInput') as HTMLTextAreaElement;
    const token = jwtInput?.value.trim();

    if (!token) {
      this.clearResults();
      return;
    }

    try {
      this.decoded = this.decodeJwt(token);
      this.displayResults();
      this.updatePartsIndicator(true);
    } catch (error) {
      this.displayError(error instanceof Error ? error.message : '解析失败');
      this.updatePartsIndicator(false);
    }
  }

  private decodeJwt(token: string): DecodedJwt {
    const parts = token.split('.');

    if (parts.length !== 3) {
      throw new Error('无效的 JWT 格式：应包含 3 个部分（Header.Payload.Signature）');
    }

    const [headerB64, payloadB64, signatureB64] = parts;

    let header: JwtHeader;
    let payload: JwtPayload;

    try {
      header = JSON.parse(this.base64UrlDecode(headerB64));
    } catch {
      throw new Error('Header 解码失败：无效的 Base64 或 JSON');
    }

    try {
      payload = JSON.parse(this.base64UrlDecode(payloadB64));
    } catch {
      throw new Error('Payload 解码失败：无效的 Base64 或 JSON');
    }

    return {
      header,
      payload,
      signature: signatureB64,
      raw: {
        header: headerB64,
        payload: payloadB64,
        signature: signatureB64,
      },
    };
  }

  private base64UrlDecode(str: string): string {
    // 替换 URL-safe 字符
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');

    // 添加填充
    const padding = base64.length % 4;
    if (padding) {
      base64 += '='.repeat(4 - padding);
    }

    try {
      return decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
    } catch {
      return atob(base64);
    }
  }

  private displayResults(): void {
    if (!this.decoded) return;

    // Header
    const headerJson = this.querySelector('#headerJson');
    const headerAlg = this.querySelector('#headerAlg');
    if (headerJson) {
      headerJson.innerHTML = this.formatJson(this.decoded.header);
    }
    if (headerAlg) {
      headerAlg.textContent = `算法: ${this.decoded.header.alg}`;
    }

    // Payload
    const payloadJson = this.querySelector('#payloadJson');
    const claimsCount = this.querySelector('#claimsCount');
    if (payloadJson) {
      payloadJson.innerHTML = this.formatJson(this.decoded.payload);
    }
    if (claimsCount) {
      const count = Object.keys(this.decoded.payload).length;
      claimsCount.textContent = `${count} 个 claims`;
    }

    // 更新时间信息
    this.updateTimeInfo();

    // 更新过期状态
    this.updateExpiryStatus();

    // 高亮存在的 claims
    this.updateClaimsHighlight(Object.keys(this.decoded.payload));

    // Signature
    const signatureDisplay = this.querySelector('#signatureDisplay');
    if (signatureDisplay) {
      signatureDisplay.textContent = this.decoded.signature;
    }

    // 移除错误状态
    this.querySelectorAll('.jwt-part').forEach((el) => {
      el.classList.remove('error', 'empty');
    });
  }

  private formatJson(obj: any): string {
    const json = JSON.stringify(obj, null, 2);
    return json.replace(
      /(".*?")(:)?(\s*)(.*?)(?=,|\n|})/g,
      (match, key, colon, space, value) => {
        if (colon) {
          // 这是一个键
          let formattedValue = value;
          if (value.startsWith('"')) {
            formattedValue = `<span class="json-string">${this.escapeHtml(value)}</span>`;
          } else if (value === 'true' || value === 'false') {
            formattedValue = `<span class="json-boolean">${value}</span>`;
          } else if (value === 'null') {
            formattedValue = `<span class="json-null">${value}</span>`;
          } else if (!isNaN(Number(value)) && value !== '') {
            formattedValue = `<span class="json-number">${value}</span>`;
          }
          return `<span class="json-key">${this.escapeHtml(key)}</span>${colon}${space}${formattedValue}`;
        }
        return match;
      }
    );
  }

  private updateTimeInfo(): void {
    if (!this.decoded) return;

    const { payload } = this.decoded;

    // iat
    const iatValue = this.querySelector('#iatValue');
    const iatInfo = this.querySelector('#iatInfo');
    if (iatValue && iatInfo) {
      if (payload.iat) {
        iatValue.textContent = this.formatTimestamp(payload.iat);
        iatInfo.style.display = 'flex';
      } else {
        iatInfo.style.display = 'none';
      }
    }

    // exp
    const expValue = this.querySelector('#expValue');
    const expInfo = this.querySelector('#expInfo');
    if (expValue && expInfo) {
      if (payload.exp) {
        expValue.textContent = this.formatTimestamp(payload.exp);
        expInfo.style.display = 'flex';
      } else {
        expInfo.style.display = 'none';
      }
    }

    // nbf
    const nbfValue = this.querySelector('#nbfValue');
    const nbfInfo = this.querySelector('#nbfInfo');
    if (nbfValue && nbfInfo) {
      if (payload.nbf) {
        nbfValue.textContent = this.formatTimestamp(payload.nbf);
        nbfInfo.style.display = 'flex';
      } else {
        nbfInfo.style.display = 'none';
      }
    }
  }

  private formatTimestamp(ts: number): string {
    // JWT 时间戳是秒级的
    const date = new Date(ts * 1000);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  private updateExpiryStatus(): void {
    if (!this.decoded) return;

    const { payload } = this.decoded;
    const expiryStatus = this.querySelector('#expiryStatus');

    if (!expiryStatus) return;

    const now = Math.floor(Date.now() / 1000);

    expiryStatus.classList.remove('show', 'valid', 'expired', 'not-yet');

    if (payload.exp) {
      if (now > payload.exp) {
        // 已过期
        const expiredAgo = this.formatDuration(now - payload.exp);
        expiryStatus.innerHTML = `⚠️ Token 已过期 ${expiredAgo}`;
        expiryStatus.classList.add('show', 'expired');
      } else {
        // 未过期
        const expiresIn = this.formatDuration(payload.exp - now);
        expiryStatus.innerHTML = `✅ Token 有效，将在 ${expiresIn} 后过期`;
        expiryStatus.classList.add('show', 'valid');
      }
    }

    if (payload.nbf && now < payload.nbf) {
      const startsIn = this.formatDuration(payload.nbf - now);
      expiryStatus.innerHTML = `⏳ Token 尚未生效，将在 ${startsIn} 后生效`;
      expiryStatus.classList.add('show', 'not-yet');
    }
  }

  private formatDuration(seconds: number): string {
    if (seconds < 60) {
      return `${seconds} 秒`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      return `${minutes} 分钟`;
    } else if (seconds < 86400) {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return minutes > 0 ? `${hours} 小时 ${minutes} 分钟` : `${hours} 小时`;
    } else {
      const days = Math.floor(seconds / 86400);
      const hours = Math.floor((seconds % 86400) / 3600);
      return hours > 0 ? `${days} 天 ${hours} 小时` : `${days} 天`;
    }
  }

  private updateClaimsHighlight(presentClaims: string[]): void {
    const claimItems = this.querySelectorAll('.claim-item');
    claimItems.forEach((item) => {
      const keyEl = item.querySelector('.claim-key');
      if (keyEl) {
        const key = keyEl.textContent;
        item.classList.toggle('active', key ? presentClaims.includes(key) : false);
      }
    });
  }

  private updatePartsIndicator(valid: boolean): void {
    const dots = this.querySelectorAll('.part-dot');
    dots.forEach((dot) => {
      dot.classList.toggle('active', valid);
    });
  }

  private displayError(message: string): void {
    this.clearResults();

    const headerJson = this.querySelector('#headerJson');
    if (headerJson) {
      headerJson.innerHTML = `<span class="error-message">${this.escapeHtml(message)}</span>`;
    }

    const headerPart = this.querySelector('#headerPart');
    if (headerPart) {
      headerPart.classList.add('error');
    }
  }

  private clearResults(): void {
    this.decoded = null;

    const headerJson = this.querySelector('#headerJson');
    const payloadJson = this.querySelector('#payloadJson');
    const signatureDisplay = this.querySelector('#signatureDisplay');
    const headerAlg = this.querySelector('#headerAlg');
    const claimsCount = this.querySelector('#claimsCount');
    const expiryStatus = this.querySelector('#expiryStatus');

    if (headerJson) headerJson.textContent = '';
    if (payloadJson) payloadJson.textContent = '';
    if (signatureDisplay) signatureDisplay.textContent = '';
    if (headerAlg) headerAlg.textContent = '';
    if (claimsCount) claimsCount.textContent = '';
    if (expiryStatus) {
      expiryStatus.classList.remove('show', 'valid', 'expired', 'not-yet');
    }

    this.updateClaimsHighlight([]);
    this.updatePartsIndicator(false);

    // 隐藏时间信息
    ['#iatInfo', '#expInfo', '#nbfInfo'].forEach((id) => {
      const el = this.querySelector(id);
      if (el) el.style.display = 'none';
    });
  }

  private async pasteFromClipboard(): Promise<void> {
    try {
      const text = await navigator.clipboard.readText();
      const jwtInput = this.querySelector('#jwtInput') as HTMLTextAreaElement;
      if (jwtInput) {
        jwtInput.value = text.trim();
        this.parseJwt();
        toast('已粘贴');
      }
    } catch {
      toast('粘贴失败，请检查剪贴板权限');
    }
  }

  private loadSample(): void {
    const jwtInput = this.querySelector('#jwtInput') as HTMLTextAreaElement;
    if (jwtInput) {
      jwtInput.value = SAMPLE_JWT;
      this.parseJwt();
      toast('已加载示例 Token');
    }
  }

  private clear(): void {
    const jwtInput = this.querySelector('#jwtInput') as HTMLTextAreaElement;
    if (jwtInput) {
      jwtInput.value = '';
    }
    this.clearResults();
    toast('已清空');
  }

  private async copyPart(part: 'header' | 'payload' | 'signature'): Promise<void> {
    if (!this.decoded) {
      toast('没有可复制的内容');
      return;
    }

    let content: string;
    switch (part) {
      case 'header':
        content = JSON.stringify(this.decoded.header, null, 2);
        break;
      case 'payload':
        content = JSON.stringify(this.decoded.payload, null, 2);
        break;
      case 'signature':
        content = this.decoded.signature;
        break;
    }

    try {
      await navigator.clipboard.writeText(content);
      toast(`${part.charAt(0).toUpperCase() + part.slice(1)} 已复制`);
    } catch {
      toast('复制失败');
    }
  }

  private async verifySignature(): Promise<void> {
    if (!this.decoded) {
      toast('请先输入 JWT Token');
      return;
    }

    const secretInput = this.querySelector('#secretInput') as HTMLTextAreaElement;
    const verifyResult = this.querySelector('#verifyResult');
    const secretType = this.querySelector('input[name="secretType"]:checked') as HTMLInputElement;

    if (!secretInput || !verifyResult) return;

    const secret = secretInput.value.trim();
    if (!secret) {
      toast('请输入密钥');
      return;
    }

    const { alg } = this.decoded.header;
    const isHmac = alg.startsWith('HS');

    if (isHmac && secretType?.value === 'publicKey') {
      toast('HMAC 算法应使用 Secret，而非 Public Key');
      return;
    }

    if (!isHmac && secretType?.value === 'secret') {
      toast('RSA/EC 算法应使用 Public Key，而非 Secret');
      return;
    }

    try {
      if (isHmac) {
        const isValid = await this.verifyHmac(secret);
        verifyResult.textContent = isValid ? '✅ 签名有效' : '❌ 签名无效';
        verifyResult.className = `verify-result ${isValid ? 'valid' : 'invalid'}`;
      } else {
        // RSA/EC 验证需要 Web Crypto API，这里简化处理
        verifyResult.textContent = '⚠️ RSA/EC 验证暂不支持';
        verifyResult.className = 'verify-result';
      }
    } catch (error) {
      verifyResult.textContent = '❌ 验证失败';
      verifyResult.className = 'verify-result invalid';
    }
  }

  private async verifyHmac(secret: string): Promise<boolean> {
    if (!this.decoded) return false;

    const { alg } = this.decoded.header;
    const { header, payload, signature } = this.decoded.raw;

    // 确定哈希算法
    let hashAlg: string;
    switch (alg) {
      case 'HS256':
        hashAlg = 'SHA-256';
        break;
      case 'HS384':
        hashAlg = 'SHA-384';
        break;
      case 'HS512':
        hashAlg = 'SHA-512';
        break;
      default:
        throw new Error(`不支持的算法: ${alg}`);
    }

    // 编码密钥
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);

    // 导入密钥
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: hashAlg },
      false,
      ['sign']
    );

    // 签名
    const data = encoder.encode(`${header}.${payload}`);
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, data);

    // 转换为 Base64URL
    const computedSignature = this.arrayBufferToBase64Url(signatureBuffer);

    return computedSignature === signature;
  }

  private arrayBufferToBase64Url(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    bytes.forEach((b) => (binary += String.fromCharCode(b)));
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  private escapeHtml(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
