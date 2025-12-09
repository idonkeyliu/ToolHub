import { Tool } from '../../core/Tool';
import { ToolConfig, ToolCategory } from '../../types/index';
import { template } from './template';

export class ColorTool extends Tool {
  static readonly config: ToolConfig = {
    key: 'color',
    title: '颜色工具',
    category: ToolCategory.CONVERTER,
    icon: '🎨',
    description: '颜色选择、转换与调色板',
    keywords: ['颜色', 'color', 'hex', 'rgb', 'hsl', '调色板'],
  };

  readonly config = ColorTool.config;

  private currentColor = { h: 16, s: 79, v: 100 };
  private palette: string[] = [];
  private isDragging = false;
  private documentMouseUpHandler: (() => void) | null = null;

  render(): HTMLElement {
    const container = document.createElement('div');
    container.innerHTML = template;
    return container.firstElementChild as HTMLElement;
  }

  protected bindEvents(): void {
    this.loadPalette();
    this.initColorWheel();
    this.bindColorEvents();
    this.updateColorDisplay();
  }

  private loadPalette(): void {
    const saved = localStorage.getItem('colorPalette');
    if (saved) {
      this.palette = JSON.parse(saved);
      this.renderPalette();
    }
  }

  private savePalette(): void {
    localStorage.setItem('colorPalette', JSON.stringify(this.palette));
  }

  private initColorWheel(): void {
    const canvas = this.querySelector<HTMLCanvasElement>('#colorWheel');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 5;

    // 绘制色环
    for (let angle = 0; angle < 360; angle++) {
      const startAngle = (angle - 1) * Math.PI / 180;
      const endAngle = (angle + 1) * Math.PI / 180;
      
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
      gradient.addColorStop(0, 'white');
      gradient.addColorStop(1, `hsl(${angle}, 100%, 50%)`);
      
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    // 更新光标位置
    this.updateCursorPosition();
  }

  private updateCursorPosition(): void {
    const canvas = this.querySelector<HTMLCanvasElement>('#colorWheel');
    const cursor = this.querySelector<HTMLElement>('#colorCursor');
    if (!canvas || !cursor) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 5;

    const angle = this.currentColor.h * Math.PI / 180;
    const distance = (this.currentColor.s / 100) * radius;

    const x = centerX + Math.cos(angle) * distance;
    const y = centerY + Math.sin(angle) * distance;

    cursor.style.left = `${x - 10}px`;
    cursor.style.top = `${y - 10}px`;
    cursor.style.background = this.hsvToHex(this.currentColor.h, this.currentColor.s, this.currentColor.v);
  }

  private bindColorEvents(): void {
    // 色环交互
    const canvas = this.querySelector<HTMLCanvasElement>('#colorWheel');
    if (canvas) {
      this.addEventListener(canvas, 'mousedown', (e) => {
        this.isDragging = true;
        this.handleColorWheelClick(e as MouseEvent);
      });

      this.addEventListener(canvas, 'mousemove', (e) => {
        if (this.isDragging) {
          this.handleColorWheelClick(e as MouseEvent);
        }
      });

      // 使用原生方式添加 document 事件
      this.documentMouseUpHandler = () => {
        this.isDragging = false;
      };
      document.addEventListener('mouseup', this.documentMouseUpHandler);
      this.cleanupFns.push(() => {
        if (this.documentMouseUpHandler) {
          document.removeEventListener('mouseup', this.documentMouseUpHandler);
        }
      });
    }

    // 亮度滑块
    const brightnessSlider = this.querySelector<HTMLInputElement>('#brightnessSlider');
    if (brightnessSlider) {
      this.addEventListener(brightnessSlider, 'input', () => {
        this.currentColor.v = parseInt(brightnessSlider.value);
        this.updateColorDisplay();
      });
    }

    // Tab 切换
    this.querySelectorAll('.conv-tab').forEach(tab => {
      this.addEventListener(tab, 'click', () => {
        const type = tab.getAttribute('data-type');
        this.switchTab(type || 'hex');
      });
    });

    // HEX 输入
    const hexInput = this.querySelector<HTMLInputElement>('#hexInput');
    if (hexInput) {
      this.addEventListener(hexInput, 'input', () => {
        const hex = hexInput.value;
        if (/^#?[0-9A-Fa-f]{6}$/.test(hex)) {
          const rgb = this.hexToRgb(hex.replace('#', ''));
          if (rgb) {
            const hsv = this.rgbToHsv(rgb.r, rgb.g, rgb.b);
            this.currentColor = hsv;
            this.updateColorDisplay();
            this.updateCursorPosition();
          }
        }
      });
    }

    // RGB 输入
    ['rgbR', 'rgbG', 'rgbB'].forEach(id => {
      const input = this.querySelector<HTMLInputElement>(`#${id}`);
      if (input) {
        this.addEventListener(input, 'input', () => this.handleRgbInput());
      }
    });

    // HSL 输入
    ['hslH', 'hslS', 'hslL'].forEach(id => {
      const input = this.querySelector<HTMLInputElement>(`#${id}`);
      if (input) {
        this.addEventListener(input, 'input', () => this.handleHslInput());
      }
    });

    // HSV 输入
    ['hsvH', 'hsvS', 'hsvV'].forEach(id => {
      const input = this.querySelector<HTMLInputElement>(`#${id}`);
      if (input) {
        this.addEventListener(input, 'input', () => this.handleHsvInput());
      }
    });

    // 复制按钮
    this.querySelectorAll('.copy-color-btn').forEach(btn => {
      this.addEventListener(btn, 'click', () => {
        const type = btn.getAttribute('data-type');
        this.copyColor(type || 'hex');
      });
    });

    // 添加到调色板
    const addBtn = this.querySelector('#addToPalette');
    if (addBtn) {
      this.addEventListener(addBtn, 'click', () => this.addToPalette());
    }

    // 清空调色板
    const clearBtn = this.querySelector('#clearPalette');
    if (clearBtn) {
      this.addEventListener(clearBtn, 'click', () => this.clearPalette());
    }

    // 预设颜色
    this.querySelectorAll('.preset-color').forEach(preset => {
      this.addEventListener(preset, 'click', () => {
        const color = preset.getAttribute('data-color');
        if (color) {
          const rgb = this.hexToRgb(color.replace('#', ''));
          if (rgb) {
            const hsv = this.rgbToHsv(rgb.r, rgb.g, rgb.b);
            this.currentColor = hsv;
            this.updateColorDisplay();
            this.updateCursorPosition();
          }
        }
      });
    });
  }

  private handleColorWheelClick(e: MouseEvent): void {
    const canvas = this.querySelector<HTMLCanvasElement>('#colorWheel');
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 5;

    const dx = x - centerX;
    const dy = y - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= radius) {
      let angle = Math.atan2(dy, dx) * 180 / Math.PI;
      if (angle < 0) angle += 360;

      this.currentColor.h = Math.round(angle);
      this.currentColor.s = Math.round((distance / radius) * 100);
      this.updateColorDisplay();
      this.updateCursorPosition();
    }
  }

  private switchTab(type: string): void {
    this.querySelectorAll('.conv-tab').forEach(tab => {
      tab.classList.toggle('active', tab.getAttribute('data-type') === type);
    });
    this.querySelectorAll('.conv-input-group').forEach(group => {
      group.classList.toggle('active', group.getAttribute('data-type') === type);
    });
  }

  private handleRgbInput(): void {
    const r = parseInt((this.querySelector<HTMLInputElement>('#rgbR'))?.value || '0');
    const g = parseInt((this.querySelector<HTMLInputElement>('#rgbG'))?.value || '0');
    const b = parseInt((this.querySelector<HTMLInputElement>('#rgbB'))?.value || '0');

    if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
      const hsv = this.rgbToHsv(r, g, b);
      this.currentColor = hsv;
      this.updateColorDisplay(false);
      this.updateCursorPosition();
    }
  }

  private handleHslInput(): void {
    const h = parseInt((this.querySelector<HTMLInputElement>('#hslH'))?.value || '0');
    const s = parseInt((this.querySelector<HTMLInputElement>('#hslS'))?.value || '0');
    const l = parseInt((this.querySelector<HTMLInputElement>('#hslL'))?.value || '0');

    if (!isNaN(h) && !isNaN(s) && !isNaN(l)) {
      const rgb = this.hslToRgb(h, s, l);
      const hsv = this.rgbToHsv(rgb.r, rgb.g, rgb.b);
      this.currentColor = hsv;
      this.updateColorDisplay(false);
      this.updateCursorPosition();
    }
  }

  private handleHsvInput(): void {
    const h = parseInt((this.querySelector<HTMLInputElement>('#hsvH'))?.value || '0');
    const s = parseInt((this.querySelector<HTMLInputElement>('#hsvS'))?.value || '0');
    const v = parseInt((this.querySelector<HTMLInputElement>('#hsvV'))?.value || '0');

    if (!isNaN(h) && !isNaN(s) && !isNaN(v)) {
      this.currentColor = { h, s, v };
      this.updateColorDisplay(false);
      this.updateCursorPosition();
    }
  }

  private updateColorDisplay(updateInputs = true): void {
    const { h, s, v } = this.currentColor;
    const hex = this.hsvToHex(h, s, v);
    const rgb = this.hsvToRgb(h, s, v);
    const hsl = this.rgbToHsl(rgb.r, rgb.g, rgb.b);

    // 更新预览
    const preview = this.querySelector<HTMLElement>('#colorPreview');
    if (preview) {
      preview.style.background = hex;
      preview.style.boxShadow = `0 8px 32px ${hex}50`;
    }

    // 更新颜色名称
    const colorName = this.querySelector('#colorName');
    if (colorName) colorName.textContent = hex.toUpperCase();

    const colorDesc = this.querySelector('#colorDesc');
    if (colorDesc) colorDesc.textContent = this.getColorName(h, s, v);

    // 更新亮度滑块
    const brightnessSlider = this.querySelector<HTMLInputElement>('#brightnessSlider');
    if (brightnessSlider) brightnessSlider.value = v.toString();

    if (updateInputs) {
      // 更新输入框
      const hexInput = this.querySelector<HTMLInputElement>('#hexInput');
      if (hexInput) hexInput.value = hex.toUpperCase();

      const rgbR = this.querySelector<HTMLInputElement>('#rgbR');
      const rgbG = this.querySelector<HTMLInputElement>('#rgbG');
      const rgbB = this.querySelector<HTMLInputElement>('#rgbB');
      if (rgbR) rgbR.value = rgb.r.toString();
      if (rgbG) rgbG.value = rgb.g.toString();
      if (rgbB) rgbB.value = rgb.b.toString();

      const hslH = this.querySelector<HTMLInputElement>('#hslH');
      const hslS = this.querySelector<HTMLInputElement>('#hslS');
      const hslL = this.querySelector<HTMLInputElement>('#hslL');
      if (hslH) hslH.value = hsl.h.toString();
      if (hslS) hslS.value = hsl.s.toString();
      if (hslL) hslL.value = hsl.l.toString();

      const hsvH = this.querySelector<HTMLInputElement>('#hsvH');
      const hsvS = this.querySelector<HTMLInputElement>('#hsvS');
      const hsvV = this.querySelector<HTMLInputElement>('#hsvV');
      if (hsvH) hsvH.value = h.toString();
      if (hsvS) hsvS.value = s.toString();
      if (hsvV) hsvV.value = v.toString();
    }
  }

  private copyColor(type: string): void {
    const { h, s, v } = this.currentColor;
    let text = '';

    switch (type) {
      case 'hex':
        text = this.hsvToHex(h, s, v).toUpperCase();
        break;
      case 'rgb':
        const rgb = this.hsvToRgb(h, s, v);
        text = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
        break;
      case 'hsl':
        const hsl = this.rgbToHsl(...Object.values(this.hsvToRgb(h, s, v)) as [number, number, number]);
        text = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
        break;
      case 'hsv':
        text = `hsv(${h}, ${s}%, ${v}%)`;
        break;
    }

    navigator.clipboard.writeText(text);
  }

  private addToPalette(): void {
    const hex = this.hsvToHex(this.currentColor.h, this.currentColor.s, this.currentColor.v);
    if (!this.palette.includes(hex)) {
      this.palette.push(hex);
      this.savePalette();
      this.renderPalette();
    }
  }

  private clearPalette(): void {
    this.palette = [];
    this.savePalette();
    this.renderPalette();
  }

  private renderPalette(): void {
    const container = this.querySelector('#colorPalette');
    if (!container) return;

    container.innerHTML = this.palette.map((color, index) => `
      <div class="palette-color" data-color="${color}" data-index="${index}" style="background: ${color};" title="${color}">
        <div class="delete-color">×</div>
      </div>
    `).join('');

    // 绑定事件
    container.querySelectorAll('.palette-color').forEach(item => {
      this.addEventListener(item as HTMLElement, 'click', (e) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('delete-color')) {
          const index = parseInt(item.getAttribute('data-index') || '0');
          this.palette.splice(index, 1);
          this.savePalette();
          this.renderPalette();
        } else {
          const color = item.getAttribute('data-color');
          if (color) {
            const rgb = this.hexToRgb(color.replace('#', ''));
            if (rgb) {
              const hsv = this.rgbToHsv(rgb.r, rgb.g, rgb.b);
              this.currentColor = hsv;
              this.updateColorDisplay();
              this.updateCursorPosition();
            }
          }
        }
      });
    });
  }

  // 颜色转换工具函数
  private hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
    s /= 100;
    v /= 100;
    const c = v * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = v - c;

    let r = 0, g = 0, b = 0;
    if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
    else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
    else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
    else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
    else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }

    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255)
    };
  }

  private rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;

    let h = 0;
    if (d !== 0) {
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
      if (h < 0) h += 360;
    }

    const s = max === 0 ? 0 : (d / max) * 100;
    const v = max * 100;

    return { h: Math.round(h), s: Math.round(s), v: Math.round(v) };
  }

  private hsvToHex(h: number, s: number, v: number): string {
    const rgb = this.hsvToRgb(h, s, v);
    return '#' + [rgb.r, rgb.g, rgb.b].map(x => x.toString(16).padStart(2, '0')).join('');
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  private rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;

    let h = 0, s = 0;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      else if (max === g) h = ((b - r) / d + 2) / 6;
      else h = ((r - g) / d + 4) / 6;
    }

    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
  }

  private hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
    h /= 360; s /= 100; l /= 100;
    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
  }

  private getColorName(h: number, s: number, v: number): string {
    if (v < 10) return '黑色';
    if (s < 10 && v > 90) return '白色';
    if (s < 10) return '灰色';

    const hueNames: [number, string][] = [
      [15, '红色'], [45, '橙色'], [75, '黄色'], [150, '绿色'],
      [210, '青色'], [270, '蓝色'], [330, '紫色'], [360, '红色']
    ];

    for (const [threshold, name] of hueNames) {
      if (h <= threshold) return name;
    }
    return '红色';
  }
}
