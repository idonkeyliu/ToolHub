export const template = `
<div class="image-view">
  <div class="image-wrap">
    <!-- 左侧：图片预览区 -->
    <div class="image-left">
      <div class="image-preview-container">
        <div class="image-dropzone" id="imageDropzone">
          <div class="dropzone-content">
            <div class="dropzone-icon">🖼️</div>
            <div class="dropzone-text">拖拽图片到这里，或点击选择</div>
            <div class="dropzone-hint">支持 JPG、PNG、GIF、WebP、BMP、SVG</div>
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
          <button class="tool-btn" id="btnRotateLeft" title="向左旋转90°">↺</button>
          <button class="tool-btn" id="btnRotateRight" title="向右旋转90°">↻</button>
          <button class="tool-btn" id="btnFlipH" title="水平翻转">⇆</button>
          <button class="tool-btn" id="btnFlipV" title="垂直翻转">⇅</button>
        </div>
        <div class="toolbar-group">
          <button class="tool-btn" id="btnCrop" title="裁剪">✂️</button>
          <button class="tool-btn" id="btnCropConfirm" title="确认裁剪" style="display:none;">✓</button>
          <button class="tool-btn" id="btnCropCancel" title="取消裁剪" style="display:none;">✗</button>
        </div>
        <div class="toolbar-group">
          <button class="tool-btn" id="btnReset" title="重置">🔄</button>
          <button class="tool-btn" id="btnNewImage" title="选择新图片">📁</button>
        </div>
      </div>
    </div>

    <!-- 右侧：信息和操作区 -->
    <div class="image-right">
      <!-- 图片信息 -->
      <div class="image-card" id="imageInfoCard" style="display:none;">
        <h4>📊 图片信息</h4>
        <div class="info-grid" id="imageInfo"></div>
      </div>

      <!-- 调整尺寸 -->
      <div class="image-card" id="resizeCard" style="display:none;">
        <h4>📐 调整尺寸</h4>
        <div class="resize-form">
          <div class="resize-row">
            <label>宽度</label>
            <input type="number" id="resizeWidth" min="1" max="10000" />
            <span>px</span>
          </div>
          <div class="resize-row">
            <label>高度</label>
            <input type="number" id="resizeHeight" min="1" max="10000" />
            <span>px</span>
          </div>
          <label class="resize-lock">
            <input type="checkbox" id="resizeLock" checked />
            <span>锁定比例</span>
          </label>
          <button class="action-btn" id="btnResize">应用尺寸</button>
        </div>
      </div>

      <!-- 压缩设置 -->
      <div class="image-card" id="compressCard" style="display:none;">
        <h4>📦 压缩导出</h4>
        <div class="compress-form">
          <div class="compress-row">
            <label>格式</label>
            <select id="exportFormat">
              <option value="jpeg">JPEG</option>
              <option value="png">PNG</option>
              <option value="webp">WebP</option>
            </select>
          </div>
          <div class="compress-row" id="qualityRow">
            <label>质量</label>
            <input type="range" id="exportQuality" min="10" max="100" value="85" />
            <span id="qualityValue">85%</span>
          </div>
          <div class="compress-preview" id="compressPreview">
            <span>预估大小：<strong id="estimatedSize">-</strong></span>
          </div>
          <button class="action-btn primary" id="btnExport">💾 导出图片</button>
        </div>
      </div>

      <!-- 滤镜效果 -->
      <div class="image-card" id="filterCard" style="display:none;">
        <h4>🎨 滤镜调整</h4>
        <div class="filter-form">
          <div class="filter-row">
            <label>亮度</label>
            <input type="range" id="filterBrightness" min="0" max="200" value="100" />
            <span id="brightnessValue">100%</span>
          </div>
          <div class="filter-row">
            <label>对比度</label>
            <input type="range" id="filterContrast" min="0" max="200" value="100" />
            <span id="contrastValue">100%</span>
          </div>
          <div class="filter-row">
            <label>饱和度</label>
            <input type="range" id="filterSaturate" min="0" max="200" value="100" />
            <span id="saturateValue">100%</span>
          </div>
          <div class="filter-row">
            <label>灰度</label>
            <input type="range" id="filterGrayscale" min="0" max="100" value="0" />
            <span id="grayscaleValue">0%</span>
          </div>
          <div class="filter-row">
            <label>模糊</label>
            <input type="range" id="filterBlur" min="0" max="20" value="0" />
            <span id="blurValue">0px</span>
          </div>
          <button class="action-btn" id="btnApplyFilter">应用滤镜</button>
          <button class="action-btn secondary" id="btnResetFilter">重置滤镜</button>
        </div>
      </div>

      <!-- 颜色提取 -->
      <div class="image-card" id="colorCard" style="display:none;">
        <h4>🎯 主色提取</h4>
        <div class="color-palette" id="colorPalette"></div>
      </div>
    </div>
  </div>
</div>
`;
