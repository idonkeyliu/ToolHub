import { i18n } from '../../core/i18n';

export const getTemplate = () => `
<div class="color-wrap">
  <div class="color-container">
    <!-- 上方区域：颜色选择 + 转换 -->
    <div class="color-top-row">
      <!-- 主颜色选择区域 -->
      <div class="color-picker-area">
        <div class="color-display" id="colorDisplay">
          <div class="color-preview" id="colorPreview"></div>
          <div class="color-info">
            <div class="color-name" id="colorName">#FF6B35</div>
            <div class="color-desc" id="colorDesc"></div>
          </div>
        </div>
        <div class="color-controls">
          <div class="color-wheel-container">
            <canvas id="colorWheel" width="240" height="240"></canvas>
            <div class="color-cursor" id="colorCursor"></div>
          </div>
          <div class="brightness-slider-container">
            <input type="range" id="brightnessSlider" min="0" max="100" value="100" class="brightness-slider">
            <div class="slider-label">${i18n.t('color.brightness')}</div>
          </div>
        </div>
      </div>
      
      <!-- 颜色转换区域 -->
      <div class="color-conversion-section">
        <div class="conversion-tabs">
          <div class="conv-tab active" data-type="hex">HEX</div>
          <div class="conv-tab" data-type="rgb">RGB</div>
          <div class="conv-tab" data-type="hsl">HSL</div>
          <div class="conv-tab" data-type="hsv">HSV</div>
        </div>
        <div class="conversion-inputs">
          <div class="conv-input-group active" data-type="hex">
            <input type="text" id="hexInput" placeholder="#FF6B35" class="color-input">
            <button class="copy-color-btn" data-type="hex">${i18n.t('color.copy')}</button>
          </div>
          <div class="conv-input-group" data-type="rgb">
            <div class="rgb-inputs">
              <input type="number" id="rgbR" min="0" max="255" placeholder="255" class="rgb-input">
              <input type="number" id="rgbG" min="0" max="255" placeholder="107" class="rgb-input">
              <input type="number" id="rgbB" min="0" max="255" placeholder="53" class="rgb-input">
            </div>
            <button class="copy-color-btn" data-type="rgb">${i18n.t('color.copy')}</button>
          </div>
          <div class="conv-input-group" data-type="hsl">
            <div class="hsl-inputs">
              <input type="number" id="hslH" min="0" max="360" placeholder="16" class="hsl-input">
              <input type="number" id="hslS" min="0" max="100" placeholder="100" class="hsl-input">
              <input type="number" id="hslL" min="0" max="100" placeholder="60" class="hsl-input">
            </div>
            <button class="copy-color-btn" data-type="hsl">${i18n.t('color.copy')}</button>
          </div>
          <div class="conv-input-group" data-type="hsv">
            <div class="hsv-inputs">
              <input type="number" id="hsvH" min="0" max="360" placeholder="16" class="hsv-input">
              <input type="number" id="hsvS" min="0" max="100" placeholder="79" class="hsv-input">
              <input type="number" id="hsvV" min="0" max="100" placeholder="100" class="hsv-input">
            </div>
            <button class="copy-color-btn" data-type="hsv">${i18n.t('color.copy')}</button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 下方区域：调色板 + 预设 -->
    <div class="color-bottom-row">
      <!-- 调色板区域 -->
      <div class="color-palette-section">
        <div class="palette-header">
          <h3>${i18n.t('color.palette')}</h3>
          <div class="palette-actions">
            <button id="addToPalette" class="palette-btn">${i18n.t('color.addToPalette')}</button>
            <button id="clearPalette" class="palette-btn secondary">${i18n.t('color.clearPalette')}</button>
          </div>
        </div>
        <div class="color-palette" id="colorPalette"></div>
      </div>
      
      <!-- 预设颜色区域 -->
      <div class="preset-colors-section">
        <h3>${i18n.t('color.presetColors')}</h3>
        <div class="preset-grid">
          <div class="preset-color" data-color="#FF6B35" style="background: #FF6B35;"></div>
          <div class="preset-color" data-color="#8B5CF6" style="background: #8B5CF6;"></div>
          <div class="preset-color" data-color="#00D2D3" style="background: #00D2D3;"></div>
          <div class="preset-color" data-color="#22C55E" style="background: #22C55E;"></div>
          <div class="preset-color" data-color="#EF4444" style="background: #EF4444;"></div>
          <div class="preset-color" data-color="#3B82F6" style="background: #3B82F6;"></div>
          <div class="preset-color" data-color="#F59E0B" style="background: #F59E0B;"></div>
          <div class="preset-color" data-color="#EC4899" style="background: #EC4899;"></div>
          <div class="preset-color" data-color="#10B981" style="background: #10B981;"></div>
          <div class="preset-color" data-color="#F97316" style="background: #F97316;"></div>
          <div class="preset-color" data-color="#6366F1" style="background: #6366F1;"></div>
          <div class="preset-color" data-color="#84CC16" style="background: #84CC16;"></div>
        </div>
      </div>
    </div>
  </div>
</div>
`;
