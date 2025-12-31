import { i18n } from '../../core/i18n';

export const getTemplate = () => `
<div class="image-view">
  <div class="image-wrap">
    <!-- 左侧：图片预览区 -->
    <div class="image-left">
      <div class="image-preview-container">
        <div class="image-dropzone" id="imageDropzone">
          <div class="dropzone-content">
            <div class="dropzone-icon">🖼️</div>
            <div class="dropzone-text">${i18n.t('image.dropHint')}</div>
            <div class="dropzone-hint">${i18n.t('image.supportFormats')}</div>
            <input type="file" id="imageInput" accept="image/*" hidden />
          </div>
        </div>
        <div class="image-canvas-wrap" id="imageCanvasWrap" style="display:none;">
          <canvas id="imageCanvas"></canvas>
          <div class="crop-overlay" id="cropOverlay" style="display:none;">
            <div class="crop-box" id="cropBox">
              <div class="crop-handle nw" data-handle="nw"></div>
              <div class="crop-handle ne" data-handle="ne"></div>
              <div class="crop-handle sw" data-handle="sw"></div>
              <div class="crop-handle se" data-handle="se"></div>
              <div class="crop-handle n" data-handle="n"></div>
              <div class="crop-handle s" data-handle="s"></div>
              <div class="crop-handle e" data-handle="e"></div>
              <div class="crop-handle w" data-handle="w"></div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 工具栏 -->
      <div class="image-toolbar" id="imageToolbar" style="display:none;">
        <div class="toolbar-group">
          <button class="tool-btn" id="btnRotateLeft" title="${i18n.t('image.rotateLeft')}">↺</button>
          <button class="tool-btn" id="btnRotateRight" title="${i18n.t('image.rotateRight')}">↻</button>
          <button class="tool-btn" id="btnFlipH" title="${i18n.t('image.flipH')}">⇆</button>
          <button class="tool-btn" id="btnFlipV" title="${i18n.t('image.flipV')}">⇅</button>
        </div>
        <div class="toolbar-group">
          <button class="tool-btn" id="btnCrop" title="${i18n.t('image.crop')}">✂️</button>
          <button class="tool-btn" id="btnCropConfirm" title="${i18n.t('image.confirmCrop')}" style="display:none;">✓</button>
          <button class="tool-btn" id="btnCropCancel" title="${i18n.t('image.cancelCrop')}" style="display:none;">✗</button>
        </div>
        <div class="toolbar-group">
          <button class="tool-btn" id="btnReset" title="${i18n.t('image.reset')}">🔄</button>
          <button class="tool-btn" id="btnNewImage" title="${i18n.t('image.newImage')}">📁</button>
        </div>
      </div>
    </div>

    <!-- 右侧：信息和操作区 -->
    <div class="image-right">
      <!-- 图片信息 -->
      <div class="image-card" id="imageInfoCard" style="display:none;">
        <h4>${i18n.t('image.info')}</h4>
        <div class="info-grid" id="imageInfo"></div>
      </div>

      <!-- 调整尺寸 -->
      <div class="image-card" id="resizeCard" style="display:none;">
        <h4>${i18n.t('image.resize')}</h4>
        <div class="resize-form">
          <div class="resize-row">
            <label>${i18n.t('image.width')}</label>
            <input type="number" id="resizeWidth" min="1" max="10000" />
            <span>px</span>
          </div>
          <div class="resize-row">
            <label>${i18n.t('image.height')}</label>
            <input type="number" id="resizeHeight" min="1" max="10000" />
            <span>px</span>
          </div>
          <label class="resize-lock">
            <input type="checkbox" id="resizeLock" checked />
            <span>${i18n.t('image.lockRatio')}</span>
          </label>
          <button class="action-btn" id="btnResize">${i18n.t('image.applySize')}</button>
        </div>
      </div>

      <!-- 压缩设置 -->
      <div class="image-card" id="compressCard" style="display:none;">
        <h4>${i18n.t('image.compress')}</h4>
        <div class="compress-form">
          <div class="compress-row">
            <label>${i18n.t('image.format')}</label>
            <select id="exportFormat">
              <option value="jpeg">JPEG</option>
              <option value="png">PNG</option>
              <option value="webp">WebP</option>
            </select>
          </div>
          <div class="compress-row" id="qualityRow">
            <label>${i18n.t('image.quality')}</label>
            <input type="range" id="exportQuality" min="10" max="100" value="85" />
            <span id="qualityValue">85%</span>
          </div>
          <div class="compress-preview" id="compressPreview">
            <span>${i18n.t('image.estimatedSize')}：<strong id="estimatedSize">-</strong></span>
          </div>
          <button class="action-btn primary" id="btnExport">${i18n.t('image.export')}</button>
        </div>
      </div>

      <!-- 滤镜效果 -->
      <div class="image-card" id="filterCard" style="display:none;">
        <h4>${i18n.t('image.filter')}</h4>
        <div class="filter-form">
          <div class="filter-row">
            <label>${i18n.t('image.brightness')}</label>
            <input type="range" id="filterBrightness" min="0" max="200" value="100" />
            <span id="brightnessValue">100%</span>
          </div>
          <div class="filter-row">
            <label>${i18n.t('image.contrast')}</label>
            <input type="range" id="filterContrast" min="0" max="200" value="100" />
            <span id="contrastValue">100%</span>
          </div>
          <div class="filter-row">
            <label>${i18n.t('image.saturate')}</label>
            <input type="range" id="filterSaturate" min="0" max="200" value="100" />
            <span id="saturateValue">100%</span>
          </div>
          <div class="filter-row">
            <label>${i18n.t('image.grayscale')}</label>
            <input type="range" id="filterGrayscale" min="0" max="100" value="0" />
            <span id="grayscaleValue">0%</span>
          </div>
          <div class="filter-row">
            <label>${i18n.t('image.blur')}</label>
            <input type="range" id="filterBlur" min="0" max="20" value="0" />
            <span id="blurValue">0px</span>
          </div>
          <button class="action-btn" id="btnApplyFilter">${i18n.t('image.applyFilter')}</button>
          <button class="action-btn secondary" id="btnResetFilter">${i18n.t('image.resetFilter')}</button>
        </div>
      </div>

      <!-- 颜色提取 -->
      <div class="image-card" id="colorCard" style="display:none;">
        <h4>${i18n.t('image.colorExtract')}</h4>
        <div class="color-palette" id="colorPalette"></div>
      </div>
    </div>
  </div>
</div>
`;
