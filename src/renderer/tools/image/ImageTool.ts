/**
 * 图片工具 - 支持裁剪、压缩、旋转、滤镜等功能
 */

import { Tool } from '../../core/Tool';
import { ToolConfig, ToolCategory } from '../../types/index';
import { getTemplate } from './template';
import { i18n } from '../../core/i18n';

declare function toast(msg: string): void;
declare function copyText(text: string): void;

// Electron IPC 接口
declare const llmHub: {
  saveFile: (options: { defaultName: string; filters: { name: string; extensions: string[] }[]; data: string }) => 
    Promise<{ success: boolean; canceled?: boolean; filePath?: string; error?: string }>;
};

interface ImageState {
  originalImage: HTMLImageElement | null;
  currentImageData: ImageData | null;
  width: number;
  height: number;
  rotation: number;
  flipH: boolean;
  flipV: boolean;
  filters: {
    brightness: number;
    contrast: number;
    saturate: number;
    grayscale: number;
    blur: number;
  };
}

export class ImageTool extends Tool {
  static readonly config: ToolConfig = {
    key: 'image',
    title: i18n.t('tool.image'),
    category: ToolCategory.UTILITY,
    icon: '🏞️',
    description: i18n.t('tool.imageDesc'),
    keywords: ['image', 'crop', 'compress', 'filter'],
  };

  readonly config = ImageTool.config;

  private state: ImageState = {
    originalImage: null,
    currentImageData: null,
    width: 0,
    height: 0,
    rotation: 0,
    flipH: false,
    flipV: false,
    filters: {
      brightness: 100,
      contrast: 100,
      saturate: 100,
      grayscale: 0,
      blur: 0,
    },
  };

  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private isCropping = false;
  private cropRect = { x: 0, y: 0, width: 0, height: 0 };
  private aspectRatio = 1;
  private fileName = '';
  private fileSize = 0;
  private fileType = '';

  render(): HTMLElement {
    const container = document.createElement('div');
    container.innerHTML = getTemplate();
    return container.firstElementChild as HTMLElement;
  }

  protected bindEvents(): void {
    this.canvas = this.querySelector<HTMLCanvasElement>('#imageCanvas');
    this.ctx = this.canvas?.getContext('2d') || null;

    this.bindDropzone();
    this.bindToolbar();
    this.bindResize();
    this.bindCompress();
    this.bindFilters();
  }

  private bindDropzone(): void {
    const dropzone = this.querySelector<HTMLElement>('#imageDropzone');
    const input = this.querySelector<HTMLInputElement>('#imageInput');

    if (dropzone && input) {
      this.addEventListener(dropzone, 'click', () => input.click());

      this.addEventListener(dropzone, 'dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });

      this.addEventListener(dropzone, 'dragleave', () => {
        dropzone.classList.remove('dragover');
      });

      this.addEventListener(dropzone, 'drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        const files = e.dataTransfer?.files;
        if (files && files[0]) {
          this.loadImage(files[0]);
        }
      });

      this.addEventListener(input, 'change', () => {
        if (input.files && input.files[0]) {
          this.loadImage(input.files[0]);
        }
      });
    }

    // 新图片按钮
    const btnNewImage = this.querySelector<HTMLElement>('#btnNewImage');
    if (btnNewImage && input) {
      this.addEventListener(btnNewImage, 'click', () => input.click());
    }
  }

  private bindToolbar(): void {
    // 旋转
    const btnRotateLeft = this.querySelector<HTMLElement>('#btnRotateLeft');
    const btnRotateRight = this.querySelector<HTMLElement>('#btnRotateRight');
    if (btnRotateLeft) {
      this.addEventListener(btnRotateLeft, 'click', () => this.rotate(-90));
    }
    if (btnRotateRight) {
      this.addEventListener(btnRotateRight, 'click', () => this.rotate(90));
    }

    // 翻转
    const btnFlipH = this.querySelector<HTMLElement>('#btnFlipH');
    const btnFlipV = this.querySelector<HTMLElement>('#btnFlipV');
    if (btnFlipH) {
      this.addEventListener(btnFlipH, 'click', () => this.flip('h'));
    }
    if (btnFlipV) {
      this.addEventListener(btnFlipV, 'click', () => this.flip('v'));
    }

    // 裁剪
    const btnCrop = this.querySelector<HTMLElement>('#btnCrop');
    const btnCropConfirm = this.querySelector<HTMLElement>('#btnCropConfirm');
    const btnCropCancel = this.querySelector<HTMLElement>('#btnCropCancel');
    if (btnCrop) {
      this.addEventListener(btnCrop, 'click', () => this.startCrop());
    }
    if (btnCropConfirm) {
      this.addEventListener(btnCropConfirm, 'click', () => this.applyCrop());
    }
    if (btnCropCancel) {
      this.addEventListener(btnCropCancel, 'click', () => this.cancelCrop());
    }

    // 重置
    const btnReset = this.querySelector<HTMLElement>('#btnReset');
    if (btnReset) {
      this.addEventListener(btnReset, 'click', () => this.resetImage());
    }
  }

  private bindResize(): void {
    const widthInput = this.querySelector<HTMLInputElement>('#resizeWidth');
    const heightInput = this.querySelector<HTMLInputElement>('#resizeHeight');
    const lockCheckbox = this.querySelector<HTMLInputElement>('#resizeLock');
    const btnResize = this.querySelector<HTMLElement>('#btnResize');

    if (widthInput && heightInput && lockCheckbox) {
      this.addEventListener(widthInput, 'input', () => {
        if (lockCheckbox.checked && this.aspectRatio) {
          const w = parseInt(widthInput.value) || 0;
          heightInput.value = String(Math.round(w / this.aspectRatio));
        }
      });

      this.addEventListener(heightInput, 'input', () => {
        if (lockCheckbox.checked && this.aspectRatio) {
          const h = parseInt(heightInput.value) || 0;
          widthInput.value = String(Math.round(h * this.aspectRatio));
        }
      });
    }

    if (btnResize) {
      this.addEventListener(btnResize, 'click', () => {
        const w = parseInt(widthInput?.value || '0');
        const h = parseInt(heightInput?.value || '0');
        if (w > 0 && h > 0) {
          this.resizeImage(w, h);
        }
      });
    }
  }

  private bindCompress(): void {
    const formatSelect = this.querySelector<HTMLSelectElement>('#exportFormat');
    const qualitySlider = this.querySelector<HTMLInputElement>('#exportQuality');
    const qualityValue = this.querySelector<HTMLElement>('#qualityValue');
    const qualityRow = this.querySelector<HTMLElement>('#qualityRow');
    const btnExport = this.querySelector<HTMLElement>('#btnExport');

    if (formatSelect && qualityRow) {
      this.addEventListener(formatSelect, 'change', () => {
        // PNG 不支持质量设置
        qualityRow.style.display = formatSelect.value === 'png' ? 'none' : 'flex';
        this.updateEstimatedSize();
      });
    }

    if (qualitySlider && qualityValue) {
      this.addEventListener(qualitySlider, 'input', () => {
        qualityValue.textContent = qualitySlider.value + '%';
        this.updateEstimatedSize();
      });
    }

    if (btnExport) {
      this.addEventListener(btnExport, 'click', () => this.exportImage());
    }
  }

  private bindFilters(): void {
    const filters = ['brightness', 'contrast', 'saturate', 'grayscale', 'blur'];
    
    filters.forEach(filter => {
      const slider = this.querySelector<HTMLInputElement>(`#filter${filter.charAt(0).toUpperCase() + filter.slice(1)}`);
      const valueEl = this.querySelector<HTMLElement>(`#${filter}Value`);
      
      if (slider && valueEl) {
        this.addEventListener(slider, 'input', () => {
          const val = parseInt(slider.value);
          (this.state.filters as any)[filter] = val;
          valueEl.textContent = filter === 'blur' ? val + 'px' : val + '%';
          this.applyFiltersPreview();
        });
      }
    });

    const btnApplyFilter = this.querySelector<HTMLElement>('#btnApplyFilter');
    const btnResetFilter = this.querySelector<HTMLElement>('#btnResetFilter');

    if (btnApplyFilter) {
      this.addEventListener(btnApplyFilter, 'click', () => this.applyFilters());
    }

    if (btnResetFilter) {
      this.addEventListener(btnResetFilter, 'click', () => this.resetFilters());
    }
  }

  private loadImage(file: File): void {
    if (!file.type.startsWith('image/')) {
      toast(i18n.t('image.pleaseSelectImage'));
      return;
    }

    this.fileName = file.name;
    this.fileSize = file.size;
    this.fileType = file.type;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.state.originalImage = img;
        this.state.width = img.width;
        this.state.height = img.height;
        this.state.rotation = 0;
        this.state.flipH = false;
        this.state.flipV = false;
        this.aspectRatio = img.width / img.height;
        
        this.resetFilters();
        this.drawImage();
        this.showUI();
        this.updateInfo();
        this.updateResizeInputs();
        this.extractColors();
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  private showUI(): void {
    const dropzone = this.querySelector<HTMLElement>('#imageDropzone');
    const canvasWrap = this.querySelector<HTMLElement>('#imageCanvasWrap');
    const toolbar = this.querySelector<HTMLElement>('#imageToolbar');
    const infoCard = this.querySelector<HTMLElement>('#imageInfoCard');
    const resizeCard = this.querySelector<HTMLElement>('#resizeCard');
    const compressCard = this.querySelector<HTMLElement>('#compressCard');
    const filterCard = this.querySelector<HTMLElement>('#filterCard');
    const colorCard = this.querySelector<HTMLElement>('#colorCard');

    if (dropzone) dropzone.style.display = 'none';
    if (canvasWrap) canvasWrap.style.display = 'flex';
    if (toolbar) toolbar.style.display = 'flex';
    if (infoCard) infoCard.style.display = 'block';
    if (resizeCard) resizeCard.style.display = 'block';
    if (compressCard) compressCard.style.display = 'block';
    if (filterCard) filterCard.style.display = 'block';
    if (colorCard) colorCard.style.display = 'block';
  }

  private drawImage(): void {
    if (!this.canvas || !this.ctx || !this.state.originalImage) return;

    const img = this.state.originalImage;
    let w = this.state.width;
    let h = this.state.height;

    // 处理旋转后的尺寸
    const isRotated = Math.abs(this.state.rotation % 180) === 90;
    if (isRotated) {
      [w, h] = [h, w];
    }

    this.canvas.width = w;
    this.canvas.height = h;

    this.ctx.save();
    this.ctx.translate(w / 2, h / 2);
    this.ctx.rotate((this.state.rotation * Math.PI) / 180);
    if (this.state.flipH) this.ctx.scale(-1, 1);
    if (this.state.flipV) this.ctx.scale(1, -1);

    const drawW = isRotated ? h : w;
    const drawH = isRotated ? w : h;
    this.ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    this.ctx.restore();

    this.updateEstimatedSize();
  }

  private updateInfo(): void {
    const infoEl = this.querySelector<HTMLElement>('#imageInfo');
    if (!infoEl) return;

    const formatSize = (bytes: number): string => {
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
      return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    };

    const isRotated = Math.abs(this.state.rotation % 180) === 90;
    const displayW = isRotated ? this.state.height : this.state.width;
    const displayH = isRotated ? this.state.width : this.state.height;

    infoEl.innerHTML = `
      <span class="label">${i18n.t('image.fileName')}</span><span class="value">${this.fileName}</span>
      <span class="label">${i18n.t('image.originalSize')}</span><span class="value">${formatSize(this.fileSize)}</span>
      <span class="label">${i18n.t('image.imageFormat')}</span><span class="value">${this.fileType}</span>
      <span class="label">${i18n.t('image.dimensions')}</span><span class="value">${displayW} × ${displayH} px</span>
      <span class="label">${i18n.t('image.aspectRatio')}</span><span class="value">${this.aspectRatio.toFixed(3)}</span>
    `;
  }

  private updateResizeInputs(): void {
    const widthInput = this.querySelector<HTMLInputElement>('#resizeWidth');
    const heightInput = this.querySelector<HTMLInputElement>('#resizeHeight');

    const isRotated = Math.abs(this.state.rotation % 180) === 90;
    const displayW = isRotated ? this.state.height : this.state.width;
    const displayH = isRotated ? this.state.width : this.state.height;

    if (widthInput) widthInput.value = String(displayW);
    if (heightInput) heightInput.value = String(displayH);
  }

  private rotate(deg: number): void {
    this.state.rotation = (this.state.rotation + deg + 360) % 360;
    this.drawImage();
    this.updateInfo();
    this.updateResizeInputs();
  }

  private flip(direction: 'h' | 'v'): void {
    if (direction === 'h') {
      this.state.flipH = !this.state.flipH;
    } else {
      this.state.flipV = !this.state.flipV;
    }
    this.drawImage();
  }

  private startCrop(): void {
    if (!this.canvas) return;
    
    this.isCropping = true;
    const overlay = this.querySelector<HTMLElement>('#cropOverlay');
    const btnCrop = this.querySelector<HTMLElement>('#btnCrop');
    const btnCropConfirm = this.querySelector<HTMLElement>('#btnCropConfirm');
    const btnCropCancel = this.querySelector<HTMLElement>('#btnCropCancel');

    if (overlay) overlay.style.display = 'block';
    if (btnCrop) btnCrop.style.display = 'none';
    if (btnCropConfirm) btnCropConfirm.style.display = 'flex';
    if (btnCropCancel) btnCropCancel.style.display = 'flex';

    // 获取 canvas 相对于容器的位置
    const canvasWrap = this.querySelector<HTMLElement>('#imageCanvasWrap');
    if (!canvasWrap) return;
    
    const wrapRect = canvasWrap.getBoundingClientRect();
    const canvasRect = this.canvas.getBoundingClientRect();
    
    // canvas 在容器中的偏移（因为居中显示）
    const offsetX = canvasRect.left - wrapRect.left;
    const offsetY = canvasRect.top - wrapRect.top;
    
    // 初始化裁剪框 - 覆盖整个 canvas
    const padding = 20;
    this.cropRect = {
      x: offsetX + padding,
      y: offsetY + padding,
      width: canvasRect.width - padding * 2,
      height: canvasRect.height - padding * 2,
    };

    this.updateCropBox();
    this.bindCropEvents();
  }

  private updateCropBox(): void {
    const cropBox = this.querySelector<HTMLElement>('#cropBox');
    if (!cropBox) return;

    cropBox.style.left = this.cropRect.x + 'px';
    cropBox.style.top = this.cropRect.y + 'px';
    cropBox.style.width = this.cropRect.width + 'px';
    cropBox.style.height = this.cropRect.height + 'px';
  }

  private bindCropEvents(): void {
    const cropBox = this.querySelector<HTMLElement>('#cropBox');
    const handles = this.querySelectorAll<HTMLElement>('.crop-handle');
    
    if (!cropBox) return;

    let isDragging = false;
    let isResizing = false;
    let startX = 0;
    let startY = 0;
    let startRect = { ...this.cropRect };
    let activeHandle = '';

    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      startX = e.clientX;
      startY = e.clientY;
      startRect = { ...this.cropRect };

      const target = e.target as HTMLElement;
      if (target.classList.contains('crop-handle')) {
        isResizing = true;
        activeHandle = target.dataset.handle || '';
      } else {
        isDragging = true;
      }

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    };

    const onMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      if (isDragging) {
        this.cropRect.x = startRect.x + dx;
        this.cropRect.y = startRect.y + dy;
      } else if (isResizing) {
        switch (activeHandle) {
          case 'se':
            this.cropRect.width = Math.max(50, startRect.width + dx);
            this.cropRect.height = Math.max(50, startRect.height + dy);
            break;
          case 'sw':
            this.cropRect.x = startRect.x + dx;
            this.cropRect.width = Math.max(50, startRect.width - dx);
            this.cropRect.height = Math.max(50, startRect.height + dy);
            break;
          case 'ne':
            this.cropRect.y = startRect.y + dy;
            this.cropRect.width = Math.max(50, startRect.width + dx);
            this.cropRect.height = Math.max(50, startRect.height - dy);
            break;
          case 'nw':
            this.cropRect.x = startRect.x + dx;
            this.cropRect.y = startRect.y + dy;
            this.cropRect.width = Math.max(50, startRect.width - dx);
            this.cropRect.height = Math.max(50, startRect.height - dy);
            break;
          case 'n':
            this.cropRect.y = startRect.y + dy;
            this.cropRect.height = Math.max(50, startRect.height - dy);
            break;
          case 's':
            this.cropRect.height = Math.max(50, startRect.height + dy);
            break;
          case 'e':
            this.cropRect.width = Math.max(50, startRect.width + dx);
            break;
          case 'w':
            this.cropRect.x = startRect.x + dx;
            this.cropRect.width = Math.max(50, startRect.width - dx);
            break;
        }
      }

      this.updateCropBox();
    };

    const onMouseUp = () => {
      isDragging = false;
      isResizing = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    this.addEventListener(cropBox, 'mousedown', onMouseDown);
  }

  private applyCrop(): void {
    if (!this.canvas || !this.ctx) return;

    // 获取 canvas 相对于容器的位置
    const canvasWrap = this.querySelector<HTMLElement>('#imageCanvasWrap');
    if (!canvasWrap) return;
    
    const wrapRect = canvasWrap.getBoundingClientRect();
    const canvasRect = this.canvas.getBoundingClientRect();
    
    // canvas 在容器中的偏移
    const offsetX = canvasRect.left - wrapRect.left;
    const offsetY = canvasRect.top - wrapRect.top;
    
    // 计算裁剪框相对于 canvas 的位置（而非容器）
    const relativeX = this.cropRect.x - offsetX;
    const relativeY = this.cropRect.y - offsetY;
    
    // 缩放比例：canvas 实际像素 vs 显示尺寸
    const scaleX = this.canvas.width / canvasRect.width;
    const scaleY = this.canvas.height / canvasRect.height;

    // 计算实际裁剪区域
    const cropX = Math.max(0, relativeX * scaleX);
    const cropY = Math.max(0, relativeY * scaleY);
    const cropW = Math.min(this.canvas.width - cropX, this.cropRect.width * scaleX);
    const cropH = Math.min(this.canvas.height - cropY, this.cropRect.height * scaleY);

    const imageData = this.ctx.getImageData(cropX, cropY, cropW, cropH);

    this.state.width = Math.round(cropW);
    this.state.height = Math.round(cropH);
    this.aspectRatio = this.state.width / this.state.height;

    // 创建新的临时 canvas 保存裁剪后的图像
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = this.state.width;
    tempCanvas.height = this.state.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (tempCtx) {
      tempCtx.putImageData(imageData, 0, 0);
      
      // 更新原始图像
      const newImg = new Image();
      newImg.onload = () => {
        this.state.originalImage = newImg;
        this.state.rotation = 0;
        this.state.flipH = false;
        this.state.flipV = false;
        this.drawImage();
        this.updateInfo();
        this.updateResizeInputs();
      };
      newImg.src = tempCanvas.toDataURL();
    }

    this.cancelCrop();
    toast(i18n.t('image.cropComplete'));
  }

  private cancelCrop(): void {
    this.isCropping = false;
    const overlay = this.querySelector<HTMLElement>('#cropOverlay');
    const btnCrop = this.querySelector<HTMLElement>('#btnCrop');
    const btnCropConfirm = this.querySelector<HTMLElement>('#btnCropConfirm');
    const btnCropCancel = this.querySelector<HTMLElement>('#btnCropCancel');

    if (overlay) overlay.style.display = 'none';
    if (btnCrop) btnCrop.style.display = 'flex';
    if (btnCropConfirm) btnCropConfirm.style.display = 'none';
    if (btnCropCancel) btnCropCancel.style.display = 'none';
  }

  private resizeImage(newWidth: number, newHeight: number): void {
    if (!this.canvas || !this.ctx || !this.state.originalImage) return;

    this.state.width = newWidth;
    this.state.height = newHeight;
    this.aspectRatio = newWidth / newHeight;

    // 创建临时 canvas 进行缩放
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = newWidth;
    tempCanvas.height = newHeight;
    const tempCtx = tempCanvas.getContext('2d');
    
    if (tempCtx) {
      tempCtx.drawImage(this.canvas, 0, 0, newWidth, newHeight);
      
      const newImg = new Image();
      newImg.onload = () => {
        this.state.originalImage = newImg;
        this.state.rotation = 0;
        this.state.flipH = false;
        this.state.flipV = false;
        this.drawImage();
        this.updateInfo();
      };
      newImg.src = tempCanvas.toDataURL();
    }

    toast(i18n.t('image.sizeAdjusted'));
  }

  private resetImage(): void {
    if (!this.state.originalImage) return;

    // 重新加载原始图片
    const img = this.state.originalImage;
    this.state.width = img.naturalWidth || img.width;
    this.state.height = img.naturalHeight || img.height;
    this.state.rotation = 0;
    this.state.flipH = false;
    this.state.flipV = false;
    this.aspectRatio = this.state.width / this.state.height;

    this.resetFilters();
    this.drawImage();
    this.updateInfo();
    this.updateResizeInputs();
    toast(i18n.t('image.reset'));
  }

  private applyFiltersPreview(): void {
    if (!this.canvas) return;
    
    const { brightness, contrast, saturate, grayscale, blur } = this.state.filters;
    this.canvas.style.filter = `
      brightness(${brightness}%)
      contrast(${contrast}%)
      saturate(${saturate}%)
      grayscale(${grayscale}%)
      blur(${blur}px)
    `;
  }

  private applyFilters(): void {
    if (!this.canvas || !this.ctx) return;

    // 将滤镜效果应用到图像数据
    const { brightness, contrast, saturate, grayscale, blur } = this.state.filters;
    
    // 创建临时 canvas 应用滤镜
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = this.canvas.width;
    tempCanvas.height = this.canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    
    if (tempCtx) {
      tempCtx.filter = `
        brightness(${brightness}%)
        contrast(${contrast}%)
        saturate(${saturate}%)
        grayscale(${grayscale}%)
        blur(${blur}px)
      `;
      tempCtx.drawImage(this.canvas, 0, 0);
      
      const newImg = new Image();
      newImg.onload = () => {
        this.state.originalImage = newImg;
        this.state.width = newImg.width;
        this.state.height = newImg.height;
        this.resetFilters();
        this.drawImage();
      };
      newImg.src = tempCanvas.toDataURL();
    }

    toast(i18n.t('image.filterApplied'));
  }

  private resetFilters(): void {
    this.state.filters = {
      brightness: 100,
      contrast: 100,
      saturate: 100,
      grayscale: 0,
      blur: 0,
    };

    // 重置滑块
    const sliders = [
      { id: 'filterBrightness', value: 100, label: 'brightnessValue', suffix: '%' },
      { id: 'filterContrast', value: 100, label: 'contrastValue', suffix: '%' },
      { id: 'filterSaturate', value: 100, label: 'saturateValue', suffix: '%' },
      { id: 'filterGrayscale', value: 0, label: 'grayscaleValue', suffix: '%' },
      { id: 'filterBlur', value: 0, label: 'blurValue', suffix: 'px' },
    ];

    sliders.forEach(({ id, value, label, suffix }) => {
      const slider = this.querySelector<HTMLInputElement>(`#${id}`);
      const valueEl = this.querySelector<HTMLElement>(`#${label}`);
      if (slider) slider.value = String(value);
      if (valueEl) valueEl.textContent = value + suffix;
    });

    if (this.canvas) {
      this.canvas.style.filter = 'none';
    }
  }

  private updateEstimatedSize(): void {
    if (!this.canvas) return;

    const format = (this.querySelector<HTMLSelectElement>('#exportFormat')?.value || 'jpeg') as string;
    const quality = parseInt(this.querySelector<HTMLInputElement>('#exportQuality')?.value || '85') / 100;

    const mimeType = format === 'jpeg' ? 'image/jpeg' : format === 'png' ? 'image/png' : 'image/webp';
    const dataUrl = this.canvas.toDataURL(mimeType, quality);
    const base64 = dataUrl.split(',')[1];
    const bytes = Math.round((base64.length * 3) / 4);

    const sizeEl = this.querySelector<HTMLElement>('#estimatedSize');
    if (sizeEl) {
      if (bytes < 1024) {
        sizeEl.textContent = bytes + ' B';
      } else if (bytes < 1024 * 1024) {
        sizeEl.textContent = (bytes / 1024).toFixed(2) + ' KB';
      } else {
        sizeEl.textContent = (bytes / (1024 * 1024)).toFixed(2) + ' MB';
      }
    }
  }

  private async exportImage(): Promise<void> {
    if (!this.canvas) {
      alert(i18n.t('image.pleaseSelectImageFirst'));
      return;
    }

    try {
      const format = (this.querySelector<HTMLSelectElement>('#exportFormat')?.value || 'jpeg') as string;
      const quality = parseInt(this.querySelector<HTMLInputElement>('#exportQuality')?.value || '85') / 100;

      const mimeType = format === 'jpeg' ? 'image/jpeg' : format === 'png' ? 'image/png' : 'image/webp';
      const ext = format === 'jpeg' ? 'jpg' : format;

      // 应用滤镜到导出
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = this.canvas.width;
      tempCanvas.height = this.canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      
      if (tempCtx) {
        const { brightness, contrast, saturate, grayscale, blur } = this.state.filters;
        tempCtx.filter = `
          brightness(${brightness}%)
          contrast(${contrast}%)
          saturate(${saturate}%)
          grayscale(${grayscale}%)
          blur(${blur}px)
        `;
        tempCtx.drawImage(this.canvas, 0, 0);
      }

      const dataUrl = (tempCanvas || this.canvas).toDataURL(mimeType, quality);
      const baseName = this.fileName.replace(/\.[^.]+$/, '') || 'image';
      const fileName = `${baseName}_edited.${ext}`;

      // 使用 Electron 的保存对话框
      const result = await llmHub.saveFile({
        defaultName: fileName,
        filters: [
          { name: format.toUpperCase(), extensions: [ext] },
          { name: i18n.t('common.allFiles'), extensions: ['*'] }
        ],
        data: dataUrl
      });

      if (result.canceled) {
        // 用户取消，不提示
        return;
      }

      if (result.success) {
        alert(`${i18n.t('image.exportSuccess')}\\n\\n${i18n.t('image.savePath')}：${result.filePath}`);
      } else {
        alert(`${i18n.t('image.exportFailed')}：${result.error || i18n.t('common.unknownError')}`);
      }
    } catch (e) {
      alert(i18n.t('image.exportFailedRetry'));
      console.error('Export error:', e);
    }
  }

  private extractColors(): void {
    if (!this.canvas || !this.ctx) return;

    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;
    const colorMap: Map<string, number> = new Map();

    // 采样像素
    const step = Math.max(1, Math.floor(data.length / 4 / 10000));
    for (let i = 0; i < data.length; i += step * 4) {
      const r = Math.round(data[i] / 32) * 32;
      const g = Math.round(data[i + 1] / 32) * 32;
      const b = Math.round(data[i + 2] / 32) * 32;
      const key = `${r},${g},${b}`;
      colorMap.set(key, (colorMap.get(key) || 0) + 1);
    }

    // 排序获取主色
    const sorted = [...colorMap.entries()].sort((a, b) => b[1] - a[1]);
    const topColors = sorted.slice(0, 8).map(([key]) => {
      const [r, g, b] = key.split(',').map(Number);
      return `rgb(${r},${g},${b})`;
    });

    const paletteEl = this.querySelector<HTMLElement>('#colorPalette');
    if (paletteEl) {
      paletteEl.innerHTML = topColors.map(color => {
        const hex = this.rgbToHex(color);
        return `<div class="color-swatch" style="background:${color}" data-color="${hex}" title="${hex}"></div>`;
      }).join('');

      // 点击复制
      const swatches = paletteEl.querySelectorAll('.color-swatch');
      swatches.forEach(swatch => {
        this.addEventListener(swatch as HTMLElement, 'click', () => {
          const hex = swatch.getAttribute('data-color') || '';
          copyText(hex);
          toast(`${i18n.t('common.copied')} ${hex}`);
        });
      });
    }
  }

  private rgbToHex(rgb: string): string {
    const match = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (!match) return rgb;
    const r = parseInt(match[1]).toString(16).padStart(2, '0');
    const g = parseInt(match[2]).toString(16).padStart(2, '0');
    const b = parseInt(match[3]).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
  }
}
